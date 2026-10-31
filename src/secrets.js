import Database from 'better-sqlite3';
import {constants,lstatSync,mkdirSync,openSync,closeSync,fstatSync,readFileSync,writeFileSync,fsyncSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,basename,isAbsolute} from 'node:path';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

export class SecretError extends Error {
  constructor(code='vault_unavailable',message='Secrets are unavailable. Check private vault access and restore its original key if needed.') {super(message);this.code=code;}
}
export function validateSecretKey(key){
  if(typeof key!=='string'||!/^[A-Z][A-Z0-9_]{0,127}$/.test(key))throw new SecretError('invalid_key','Use a key of 1–128 uppercase letters, digits or underscores, starting with a letter.');
}
export function validateSecretValue(value){
  if(typeof value!=='string'||!value.length||Buffer.byteLength(value)>65536||value.includes('\0'))throw new SecretError('invalid_value','Provide a nonempty text secret of at most 65536 bytes without NUL.');
}
function owned(stat){return !process.getuid||stat.uid===process.getuid();}
function privateFile(stat){return stat.isFile()&&owned(stat)&&stat.nlink===1&&!(stat.mode&0o077);}
function readPrivate(path,max=65536){
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{const stat=fstatSync(fd);if(!privateFile(stat)||stat.size>max)throw new SecretError();return readFileSync(fd);}
  finally{closeSync(fd);}
}
function checkFile(path){if(existsSync(path)||(()=>{try{lstatSync(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}})()){if(!privateFile(lstatSync(path)))throw new SecretError();}}
function atomicFile(path,value){
  checkFile(path);
  const temp=`${path}.${randomBytes(16).toString('hex')}.tmp`;
  let fd;
  try{fd=openSync(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,value);fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(temp,path);}
  finally{if(fd!==undefined)closeSync(fd);try{unlinkSync(temp);}catch{/* A private temporary file may require owner cleanup after a filesystem failure. */}}
}
export function createSecretStore({home=homedir(),clock=Date.now}={}){
  if(process.platform==='win32')throw new SecretError('unsupported_platform','Private secret storage requires macOS or Linux.');
  const root=join(home,'.ned'),directory=join(root,'secrets'),files=join(directory,'files'),filename=join(directory,'vault.sqlite'),keyfile=join(directory,'master.key');
  function directoryCheck(path,privateMode){
    const info=lstatSync(path);
    if(!info.isDirectory()||info.isSymbolicLink()||!owned(info)||(info.mode&(privateMode?0o077:0o022)))throw new SecretError();
  }
  function directories(){
    directoryCheck(home,false);
    for(const path of [root,directory,files]){try{mkdirSync(path,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}directoryCheck(path,path!==root);}
  }
  function operation(run){
    let db;
    try{
      directories();
      const hadVault=existsSync(filename);checkFile(keyfile);checkFile(filename);
      if(!existsSync(keyfile)){
        if(hadVault)throw new SecretError();
        let fd;try{fd=openSync(keyfile,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,randomBytes(32));fsyncSync(fd);}catch(error){if(error.code!=='EEXIST')throw error;}finally{if(fd!==undefined)closeSync(fd);}
      }
      const key=readPrivate(keyfile,32);if(key.length!==32)throw new SecretError();
      // Create with private mode before SQLite opens it; reject pre-existing links.
      let fd;try{fd=openSync(filename,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}catch(error){if(error.code!=='EEXIST')throw error;}finally{if(fd!==undefined)closeSync(fd);}
      checkFile(filename);
      for(const suffix of ['-wal','-shm','-journal'])checkFile(filename+suffix);
      db=new Database(filename,{timeout:5000});db.pragma('journal_mode = DELETE');db.pragma('synchronous = FULL');db.pragma('secure_delete = ON');
      db.exec('CREATE TABLE IF NOT EXISTS secrets (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updatedAt TEXT NOT NULL); CREATE TABLE IF NOT EXISTS secret_shares (id TEXT PRIMARY KEY, secret_key TEXT NOT NULL, expires INTEGER NOT NULL)');
      const decrypt=row=>{
        if(!row)throw new SecretError('not_found','Secret not found. Save it in COM Settings.');
        const data=JSON.parse(row.payload);
        if(data.version!==1)throw new SecretError();
        const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(data.nonce,'base64'),{authTagLength:16});
        decipher.setAAD(Buffer.from(row.key));decipher.setAuthTag(Buffer.from(data.tag,'base64'));
        return Buffer.concat([decipher.update(Buffer.from(data.value,'base64')),decipher.final()]).toString('utf8');
      };
      const get=name=>db.prepare('SELECT * FROM secrets WHERE key=?').get(name);
      return db.transaction(()=>{
        // Verify the retained encryption key before any mutation of a populated vault.
        const retained=db.prepare('SELECT * FROM secrets LIMIT 1').get();if(retained)decrypt(retained);
        return run({db,key,decrypt,get});
      }).immediate();
    }catch(error){if(error instanceof SecretError)throw error;throw new SecretError();}
    finally{db?.close();}
  }
  function removeExport(name){const path=join(files,name);checkFile(path);try{unlinkSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}}
  return {
    list(){return operation(({db})=>db.prepare('SELECT key,updatedAt FROM secrets ORDER BY key').all());},
    set(name,value){validateSecretKey(name);validateSecretValue(value);return operation(({db,key})=>{
      const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});cipher.setAAD(Buffer.from(name));
      const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
      const payload=JSON.stringify({version:1,nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),value:ciphertext.toString('base64')});
      removeExport(name);db.prepare('DELETE FROM secret_shares WHERE secret_key=?').run(name);
      const updatedAt=new Date().toISOString();db.prepare('INSERT INTO secrets VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updatedAt=excluded.updatedAt').run(name,payload,updatedAt);
      return {key:name,updatedAt};
    });},
    get(name,{file=false}={}){validateSecretKey(name);return operation(({decrypt,get})=>{const value=decrypt(get(name));if(!file)return value;const path=join(files,name);atomicFile(path,value);return {key:name,path};});},
    share(path){
      if(typeof path!=='string'||!isAbsolute(path))throw new SecretError('invalid_path','Use a current NED private secret export path.');
      const name=basename(path);validateSecretKey(name);
      if(path!==join(files,name))throw new SecretError('invalid_path','Use a current NED private secret export path.');
      return operation(({db,decrypt,get})=>{
        const current=Buffer.from(decrypt(get(name))),exported=readPrivate(path);
        if(!current.equals(exported))throw new SecretError('invalid_path','Re-export the current secret before sharing.');
        const id=randomBytes(32).toString('hex'),expires=clock()+900000;
        db.prepare('DELETE FROM secret_shares WHERE expires<=?').run(clock());
        db.prepare('INSERT INTO secret_shares VALUES(?,?,?)').run(id,name,expires);
        return {success:true,action:'secure_share_secret',share_id:id,expires_at:new Date(expires).toISOString()};
      });
    },
    revealShare(id){
      if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new SecretError('not_found','Secret is unavailable. Ask NED to share it again.');
      return operation(({db,decrypt,get})=>{
        const grant=db.prepare('SELECT secret_key,expires FROM secret_shares WHERE id=?').get(id);
        if(!grant||grant.expires<=clock())throw new SecretError('not_found','Secret is unavailable. Ask NED to share it again.');
        return {value:decrypt(get(grant.secret_key))};
      });
    },
    delete(name){validateSecretKey(name);return operation(({db,get})=>{if(!get(name))throw new SecretError('not_found','Secret not found.');removeExport(name);db.prepare('DELETE FROM secret_shares WHERE secret_key=?').run(name);db.prepare('DELETE FROM secrets WHERE key=?').run(name);return {key:name,deleted:true};});},
  };
}
