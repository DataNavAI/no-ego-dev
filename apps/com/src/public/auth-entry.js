import {apiClient} from './api-client.js';

const shell=document.getElementById('app-shell'),gate=document.getElementById('access-gate'),form=document.getElementById('access-form'),input=document.getElementById('access-token'),status=document.getElementById('access-status'),submit=document.getElementById('access-submit');
let initialized=false,busy=true,instanceId,accessVersion=0;
submit.disabled=true;
function show(message='Enter this instance’s access token to continue.'){
  shell.hidden=true;shell.inert=true;gate.hidden=false;document.getElementById('access-memory').hidden=true;status.textContent=message;input.value='';input.focus();
}
async function enter(result){
  const version=accessVersion;
  if(initialized&&instanceId!==result.instanceId){location.reload();return;}
  instanceId=result.instanceId;
  input.value='';
  const notice=document.getElementById('access-memory');notice.hidden=result.remembered;notice.textContent=result.remembered?'':'Connected for this tab. Browser storage is unavailable.';
  if(!initialized){await Promise.all([import('./vendor/webawesome.js'),import('./settings.js'),import('./app.js'),import('./chat-entry.js'),import('./work-entry.js')]);initialized=true;}
  else document.dispatchEvent(new Event('ned-auth-restored'));
  if(version!==accessVersion)return;
  gate.hidden=true;shell.hidden=false;shell.inert=false;
}
apiClient.onLost(reason=>{accessVersion++;show(reason==='expired'?'Access expired or changed. Enter an access token to reconnect.':'Enter this instance’s access token to continue.');});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;submit.disabled=true;status.textContent='Connecting…';
  try{await enter(await apiClient.validate(input.value.trim()));}
  catch(error){show(error.message);}
  finally{busy=false;submit.disabled=false;}
});
document.getElementById('access-forget').addEventListener('click',()=>{if(apiClient.forget())location.reload();else show('Access cleared for this tab. Clear this site’s browser storage to forget the saved token.');});
window.addEventListener('storage',event=>{if(event.key==='ned.instance-access.v1'&&event.newValue===null)apiClient.forget();});
try{await enter(await apiClient.restore());}catch(error){show(error.code==='unauthorized'?undefined:error.message);}finally{busy=false;submit.disabled=false;}
