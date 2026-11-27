import {existsSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDirectory=fileURLToPath(new URL('../',import.meta.url));
// git archive expands this value; source checkouts retain the placeholder.
const archiveRevision='$Format:%H$';
const validRevision=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const text=filename=>{try{return readFileSync(filename,'utf8').trim();}catch{return '';}};

function checkoutRevision(root){
  const marker=path.join(root,'.git');
  if(!existsSync(marker))return null; // Never inherit a surrounding repository.
  let directory;
  try{directory=statSync(marker).isDirectory()?marker:path.resolve(root,text(marker).match(/^gitdir: (.+)$/)?.[1]||'.git');}catch{return null;}
  const common=text(path.join(directory,'commondir'));
  const shared=common?path.resolve(directory,common):directory;
  let head=text(path.join(directory,'HEAD'));
  for(let depth=0;depth<5;depth++){
    if(validRevision(head))return head;
    const reference=head.match(/^ref: (refs\/[^\0\r\n\\]+)$/)?.[1];
    if(!reference||reference.split('/').some(part=>!part||part==='..'))return null;
    head=text(path.join(shared,reference));
    if(!head){
      const packed=text(path.join(shared,'packed-refs')).split('\n').find(line=>line.slice(41)===reference);
      return validRevision(packed?.slice(0,40))?packed.slice(0,40):null;
    }
  }
  return null;
}

export function sourceRevision(root=rootDirectory){
  if(existsSync(path.join(root,'.git')))return checkoutRevision(root);
  try{
    const metadata=JSON.parse(text(path.join(root,'build-info.json')));
    if(validRevision(metadata.revision))return metadata.revision;
  }catch{/* Missing or invalid build identity is displayed as unknown. */}
  if(path.basename(path.resolve(root))==='app'){
    const revision=text(path.join(root,'..','install-manifest')).match(/^revision=([a-f0-9]{40})$/m)?.[1];
    if(validRevision(revision))return revision;
  }
  if(validRevision(archiveRevision))return archiveRevision;
  return null;
}

export function buildTimestamp(date=new Date()){
  return date.toISOString().replace(/[-:T]/g,'').slice(0,14);
}

function stampedTime(root,revision){
  try{
    const metadata=JSON.parse(text(path.join(root,'build-info.json')));
    const value=metadata.builtAt;
    if(!revision||metadata.revision!==revision||typeof value!=='string'||!/^\d{14}$/.test(value))return null;
    const iso=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12,14)}Z`;
    if(buildTimestamp(new Date(iso))===value)return value;
  }catch{/* Legacy, malformed or stale metadata has no build timestamp. */}
  return null;
}

export function nedVersion(root=rootDirectory){
  const {version}=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
  if(typeof version!=='string'||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw new Error('Invalid NED base version');
  const revision=sourceRevision(root);
  const timestamp=stampedTime(root,revision);
  return `${version}+${timestamp?timestamp+'.':''}${revision?revision.slice(0,7):'unknown'}`;
}
