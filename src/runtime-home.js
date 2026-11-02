import {lstatSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

export class RuntimeHomeError extends Error {
  constructor(code='invalid_agent_home',variable='NED_AGENT_HOME') {
    super(code==='ambiguous_agent_home'
      ? 'Both HERMES_HOME and CODEX_HOME are configured without an active runtime. Set NED_AGENT_HOME explicitly.'
      : `${variable} must select an absolute directory, not a URL or symbolic link. Check ownership and permissions.`);
    this.code=code;
  }
}

// Pure selection: no filesystem creation and no CWD/process-tree/existence guessing.
// An injected home is the historical API storage override, not the OS-label home.
export function resolveRuntimeHome({home,env=process.env,osHome=homedir()}={}) {
  if(home!==undefined)return home;
  let variable,value;
  const active=keys=>keys.some(key=>typeof env[key]==='string'&&env[key].length>0);
  if(env.NED_AGENT_HOME!==undefined){variable='NED_AGENT_HOME';value=env.NED_AGENT_HOME;}
  else if(active(['HERMES_SESSION_ID','HERMES_SESSION_KEY','HERMES_SESSION_PLATFORM'])){
    variable='HERMES_HOME';value=env.HERMES_HOME??path.join(osHome,'.hermes');
  } else if(active(['CODEX_THREAD_ID','CODEX_SESSION_ID'])){
    variable='CODEX_HOME';value=env.CODEX_HOME??path.join(osHome,'.codex');
  } else {
    if(env.HERMES_HOME!==undefined&&env.CODEX_HOME!==undefined)throw new RuntimeHomeError('ambiguous_agent_home');
    if(env.HERMES_HOME!==undefined){variable='HERMES_HOME';value=env.HERMES_HOME;}
    else if(env.CODEX_HOME!==undefined){variable='CODEX_HOME';value=env.CODEX_HOME;}
    else return osHome;
  }
  if(typeof value!=='string'||!value.length||value.includes('\0')||!path.isAbsolute(value)||(/^[a-z][a-z0-9+.-]*:/i.test(value)&&!path.win32.isAbsolute(value)))throw new RuntimeHomeError('invalid_agent_home',variable);
  try {
    const info=lstatSync(path.resolve(value));
    if(!info.isDirectory()||info.isSymbolicLink())throw new RuntimeHomeError('invalid_agent_home',variable);
  } catch(error) {
    if(error.code!=='ENOENT')throw new RuntimeHomeError('invalid_agent_home',variable);
  }
  return value;
}

// Writes may initialize a missing configured home, but never chmod existing ancestors.
// Existing feature stores additionally enforce their own directory/file ownership rules.
export function ensureRuntimeHome(home) {
  try {
    mkdirSync(home,{recursive:true,mode:0o700});
    const info=lstatSync(path.resolve(home));
    if(!info.isDirectory()||info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid())||(info.mode&0o022))throw new Error();
  } catch {throw new RuntimeHomeError();}
}
