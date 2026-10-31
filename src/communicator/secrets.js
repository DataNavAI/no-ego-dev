import {createSecretStore,SecretError,validateSecretKey} from '../secrets.js';
export function createSecretsHandler({home,enabled=true}={}){
  return async(req,res,send,origin)=>{
    const fail=(status,code,message)=>send(status,{error:{code,message}});
    if(!enabled)return fail(403,'secrets_disabled','Secrets are disabled in public mode.');
    if(req.headers['x-ned-secrets']!=='1'||req.headers['sec-fetch-site']==='cross-site'||req.url.includes('?'))return fail(403,'forbidden','Access forbidden.');
    const list=req.url==='/api/secrets'&&req.method==='GET';
    if(!list&&req.headers.origin!==origin)return fail(403,'forbidden','Access forbidden.');
    const share=/^\/api\/secrets\/shares\/([a-f0-9]{64})\/reveal$/.exec(req.url);
    const match=/^\/api\/secrets\/([A-Z][A-Z0-9_]{0,127})(\/reveal)?$/.exec(req.url);
    if(!list&&!(share&&req.method==='POST')&&(!match||!(req.method==='PUT'&&!match[2]||req.method==='DELETE'&&!match[2]||req.method==='POST'&&match[2])))return fail(405,'method_not_allowed','Method not allowed.');
    if(req.method!=='PUT'&&(req.headers['transfer-encoding']||Number(req.headers['content-length']||0)>0))return fail(400,'invalid_body','This action does not accept a body.');
    try{
      if(match)validateSecretKey(match[1]);
      let body;
      if(req.method==='PUT'){
        if(!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type']||''))return fail(415,'invalid_body','Use a JSON secret value.');
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>400000)return fail(413,'too_large','Secret request is too large.');chunks.push(chunk);}
        try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{return fail(400,'invalid_body','Provide a JSON secret value.');}
        if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==1||!Object.hasOwn(body,'value'))return fail(400,'invalid_body','Provide only the secret value.');
      }
      const store=createSecretStore({home});
      if(share)return send(200,store.revealShare(share[1]));
      if(list)return send(200,{secrets:store.list()});
      if(req.method==='PUT')return send(200,store.set(match[1],body.value));
      if(req.method==='DELETE')return send(200,store.delete(match[1]));
      return send(200,{key:match[1],value:store.get(match[1])});
    }catch(error){
      const known=error instanceof SecretError;
      return fail(known&&error.code==='not_found'?404:known&&['invalid_key','invalid_value'].includes(error.code)?400:503,known?error.code:'vault_unavailable',known?error.message:'Secrets are unavailable.');
    }
  };
}
