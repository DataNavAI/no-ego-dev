export const NED_API_BASE='/api/v1';
const browserFamilies=new Set(['health','capabilities','projects','chat','secrets','workspace','activity']);

export function nedApiPath(raw='',method='GET'){
  let pathname=typeof raw==='string'?raw.split('?')[0]:'',valid=true;
  const invalid=()=>({kind:'invalid',valid:false,api:true,pathname});
  try{
    const unsafe=value=>[...value].some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127||character==='\\');
    if(!raw.startsWith('/')||raw.startsWith('//')||unsafe(raw))return invalid();
    for(let count=0;count<5;count++){
      const decoded=decodeURIComponent(pathname);
      if(decoded===pathname)break;
      pathname=decoded;valid=false;
      if(count===4)return invalid();
    }
    if(/[?#]/.test(pathname)||unsafe(pathname))return invalid();
    pathname=new URL(pathname,'http://localhost').pathname.replace(/\/{2,}/g,'/');
    if(pathname!==raw.split('?')[0])valid=false;
    if(!valid)return invalid();
    const query=raw.slice(pathname.length);
    if(/^\/api\/core(?:\/|$)/.test(pathname))return {kind:/^\/api\/core\/v1(?:\/|$)/.test(pathname)?'resource':'unknown',handler:'coordination',valid:true,api:true,legacy:true,pathname,target:raw};
    if(pathname===NED_API_BASE)return {kind:'discovery',valid:true,api:true,legacy:false,pathname,target:raw};
    if(pathname.startsWith(NED_API_BASE+'/')){
      const suffix=pathname.slice(NED_API_BASE.length),family=suffix.split('/')[1];
      if(suffix==='/execution-capabilities')return {kind:'resource',handler:'coordination',valid:true,api:true,legacy:false,pathname,family,target:'/api/core/v1/capabilities'+query};
      if(['context','task-management','coordinator','project-registrations'].includes(family)||family==='projects'&&(!['GET','HEAD'].includes(method)||/^\/projects\/[^/]+\/(?:attempts|automations|events|metrics)(?:\/|$)/.test(suffix)))return {kind:'resource',handler:'coordination',valid:true,api:true,legacy:false,pathname,family,target:'/api/core/v1'+(family==='project-registrations'?suffix.replace('/project-registrations','/projects'):suffix)+query};
      return {kind:browserFamilies.has(family)?'resource':'unknown',handler:'presentation',valid:true,api:true,legacy:false,pathname,family,target:'/api'+suffix+query};
    }
    if(pathname.startsWith('/api/')){
      const family=pathname.split('/')[2];
      return {kind:browserFamilies.has(family)?'resource':'unknown',handler:'presentation',valid:true,api:true,legacy:true,pathname,family,target:raw};
    }
    return {kind:'asset',valid:true,api:false,pathname,target:raw};
  }catch{return invalid();}
}

export function exposeNedApiPath(raw){
  const route=nedApiPath(raw);
  return route.valid&&['asset','resource','discovery'].includes(route.kind);
}
