import {open,constants} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {parse as parseDotenv} from 'dotenv';
import {parseDocument} from 'yaml';

async function readSettings(file, secret = false) {
  let handle;
  try {
    handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
    const stat=await handle.stat();
    const privateFile=!(stat.mode&0o077)&&(!process.getuid||stat.uid===process.getuid());
    if(!stat.isFile() || stat.size>1048576 || secret&&!privateFile)throw new Error('Invalid gateway settings.');
    const buffer=Buffer.alloc(1048577);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);
    if(bytesRead>1048576)throw new Error('Invalid gateway settings.');
    return {text:buffer.subarray(0,bytesRead).toString('utf8'),privateFile};
  } catch(error) {if(error.code==='ENOENT')return {text:'',privateFile:true};throw new Error('Unable to read gateway settings.',{cause:error});}
  finally {await handle?.close();}
}

export async function resolveGatewaySettings({url,key,env=process.env,home=homedir()}={}) {
  const explicitUrl=url ?? env.NED_HERMES_URL;
  const explicitKey=key ?? env.NED_HERMES_API_KEY ?? env.API_SERVER_KEY;
  if(explicitKey==='')return {url:explicitUrl ?? 'http://127.0.0.1:8642',key:''};
  if(explicitUrl!==undefined && explicitKey!==undefined)return {url:explicitUrl,key:explicitKey};
  const root=env.HERMES_HOME ?? path.join(home,'.hermes');
  const configFile=await readSettings(path.join(root,'config.yaml'));
  const document=parseDocument(configFile.text,{logLevel:'silent'});
  if(document.errors.length)throw new Error('Invalid gateway settings.');
  const config=document.toJS({maxAliasCount:20}) ?? {};
  const dotenv=parseDotenv((await readSettings(path.join(root,'.env'),true)).text);
  const blocks=[config.gateway?.platforms?.api_server,config.platforms?.api_server,config.gateway?.api_server];
  const api=Object.assign({},...blocks);
  api.extra=Object.assign({},...blocks.map(block=>block?.extra));
  const settings={...api,...api.extra};
  if(settings.key!==undefined&&!configFile.privateFile)throw new Error('Invalid gateway settings.');
  const host=env.API_SERVER_HOST ?? dotenv.API_SERVER_HOST ?? settings.host ?? '127.0.0.1';
  const port=env.API_SERVER_PORT ?? dotenv.API_SERVER_PORT ?? settings.port ?? 8642;
  if(host!=='127.0.0.1' || !/^\d+$/.test(String(port)) || Number(port)<1 || Number(port)>65535)throw new Error('Invalid gateway settings.');
  const discoveredUrl=`http://127.0.0.1:${Number(port)}`;
  const discoveredKey=dotenv.API_SERVER_KEY ?? settings.key;
  if(discoveredKey!==undefined && typeof discoveredKey!=='string')throw new Error('Invalid gateway settings.');
  return {url:explicitUrl ?? discoveredUrl,key:explicitKey ?? (explicitUrl===undefined || explicitUrl.replace(/\/$/,'')===discoveredUrl ? discoveredKey : undefined)};
}
