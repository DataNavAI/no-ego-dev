// Existing chat/layout cases deliberately stub the model-configuration boundary.
// Configuration/privacy cases live in model-setup; the actual SDK case runs in the maintained Hermes medium suite.
export function configuredModelSetup(){
  const status=async()=>({configured:true,source:'profile',model:'synthetic-fixture-model'});
  return {status,prepare:async()=>({}),register:async()=>{},close:async()=>{},handle:async(_req,_res,send)=>send(200,await status())};
}
