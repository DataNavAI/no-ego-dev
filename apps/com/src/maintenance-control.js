// Available only on the authenticated Hub control socket, never the browser
// bridge. Core persists the barrier across disconnects and process restarts.
const actions=new Set(['status','prepare','commit','release']);
const errors=new Set(['maintenance_invalid','maintenance_unsupported','maintenance_conflict','maintenance_missing','maintenance_identity_changed','maintenance_busy','instance_updating']);
export function createMaintenanceControl({maintenance,authorized,send,clock=Date.now}){
  let window=clock(),count=0;
  return {
    announce(){if(authorized())send({type:'maintenance-capabilities',version:1,supported:maintenance?.supported===true});},
    receive(message){
      if(!authorized()||message?.type!=='maintenance-request'||message.version!==1||typeof message.id!=='string'||!/^[-\w]{43}$/.test(message.id))return;
      if(clock()-window>=1000){window=clock();count=0;}
      // No async queue or buffered work: excess requests receive no authority.
      if(++count>8)return;
      const response={type:'maintenance-response',version:1,id:message.id};
      try{
        if(Object.keys(message).sort().join(',')!=='action,id,input,type,version'||!actions.has(message.action))throw {code:'maintenance_invalid'};
        if(!maintenance?.supported)throw {code:'maintenance_unsupported'};
        response.result=maintenance[message.action](message.input);
      }catch(error){response.errorCode=errors.has(error?.code)?error.code:'maintenance_busy';}
      if(authorized())send(response);
    }
  };
}
