import { resolve } from 'node:path';
import { startCom } from './server.js';
import { artifactLink, DEFAULT_COM_STATE } from './state.js';

function options(flags,names) {
 const result={};
 for(let i=0;i<flags.length;i++) {
  const flag=flags[i];
  if(flag==='--local' && names.includes('local')) {result.local=true;continue;}
  if(!names.includes(flag.slice(2)) || !flag.startsWith('--') || flags[i+1]===undefined || flags[i+1].startsWith('--')) throw new Error('Invalid COM options');
  if(result[flag.slice(2)]!==undefined) throw new Error('Duplicate COM option');
  result[flag.slice(2)]=flags[++i];
 }
 return result;
}
export async function runCom(command,flags,io) {
 try {
  if(flags.length===1 && ['--help','-h','help'].includes(flags[0])) {
   io.log('Usage:\n  ned serve --root <approved-artifact-directory> [--state <receipt.json>] [--port <0–65535>] [--local]\n  ned com link <absolute-artifact-path> [--state <receipt.json>]\nDefault: temporary public Quick Tunnel (cloudflared required). --local: loopback only. Review directory contents before sharing; the URL grants read access to the entire approved root.');
   return 0;
  }
  if(command==='com') {
   if(flags[0]!=='link' || !flags[1]) throw new Error('Usage: ned com link <absolute-artifact-path> [--state <receipt.json>]');
   const parsed=options(flags.slice(2),['state']);io.log(await artifactLink(flags[1],parsed.state || DEFAULT_COM_STATE));return 0;
  }
  const parsed=options(flags,['root','state','port','local']);
  if(!parsed.root) throw new Error('Explicit --root <approved-artifact-directory> is required');
  const port=parsed.port===undefined?4174:Number(parsed.port);
  if(parsed.port!==undefined && !/^\d+$/.test(parsed.port) || !Number.isInteger(port) || port<0 || port>65535) throw new Error('Invalid --port (0–65535)');
  const controller=new AbortController();
  // Terminal Ctrl-C can reach both launcher and child; tolerate the forwarded
  // duplicate until server/tunnel cleanup and receipt invalidation finish.
  const stop=()=>controller.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try {
   const state=resolve(parsed.state || DEFAULT_COM_STATE);
   const app=await startCom({root:parsed.root,port,local:!!parsed.local,state,signal:controller.signal});
   io.log('Read-only NED COM review space. Filename filters do not redact private content; review the approved directory before sharing.');
   io.log(`Receipt: ${state}`);
   // The capability URL is the explicitly requested launch result, not diagnostic logging.
   io.log(app.url);
   await app.closed; return 0;
  } finally {process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
 } catch(error) {
  // Filesystem errors may contain private paths; surface only safe, actionable diagnostics.
  const message=error.code ? 'Cannot access the approved root or receipt; verify directory and permissions.' : error.message;
  io.error(`NED COM: ${message}`);return 2;
 }
}
