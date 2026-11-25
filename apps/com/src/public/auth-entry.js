import {apiClient} from './api-client.js';

const shell=document.getElementById('app-shell'),gate=document.getElementById('access-gate'),form=document.getElementById('access-form'),input=document.getElementById('access-token'),status=document.getElementById('access-status'),submit=document.getElementById('access-submit'),credentials=document.getElementById('access-credentials'),retry=document.getElementById('access-retry');
let initialized=false,busy=true,instanceId,accessVersion=0,delegated=false;
let recovery=false,recoveryTimer,attempts=0;
const recoveryDelays=[750,2000,5000];
submit.disabled=true;
function show(message='Enter this instance’s access token to continue.',direct=true){
  document.dispatchEvent(new Event('ned-auth-lost'));shell.hidden=true;shell.inert=true;gate.hidden=false;document.getElementById('access-memory').hidden=true;status.textContent=message;input.value='';credentials.hidden=!direct;retry.hidden=direct;if(direct)input.focus();
}
async function enter(result){
  const version=accessVersion;
  if(initialized&&instanceId!==result.instanceId){location.reload();return;}
  instanceId=result.instanceId;delegated=result.delegated;credentials.hidden=true;retry.hidden=true;
  input.value='';
  const notice=document.getElementById('access-memory');notice.hidden=result.remembered||delegated;notice.textContent=result.remembered?'':'Connected for this tab. Browser storage is unavailable.';
  if(!initialized){await Promise.all([import('./settings.js'),import('./app.js'),import('./chat-entry.js'),import('./work-entry.js')]);initialized=true;}
  else document.dispatchEvent(new Event('ned-auth-restored'));
  if(version!==accessVersion)return;
  gate.hidden=true;shell.hidden=false;shell.inert=false;document.dispatchEvent(new Event('ned-auth-entered'));
}
function scheduleRecovery(){
  clearTimeout(recoveryTimer);
  if(recovery&&attempts<recoveryDelays.length)recoveryTimer=setTimeout(()=>{
    attempts++;void restoreAccess();
  },recoveryDelays[attempts]);
}
apiClient.onLost(reason=>{
  accessVersion++;
  clearTimeout(recoveryTimer);
  recovery=reason==='hub-expired'&&!busy&&initialized;
  attempts=0;
  const hub=delegated||apiClient.delegated||reason==='hub-expired';
  show(recovery?'Checking your NED Hub connection…':hub?'Hub access expired. Reconnect through NED Hub.':reason==='expired'?'Access expired or changed. Enter an access token to reconnect.':'Enter this instance’s access token to continue.',!hub);
  scheduleRecovery();
});
function resumeAccess(){
  if(!recovery||busy)return;
  attempts=0;
  void restoreAccess();
}
window.addEventListener('online',resumeAccess);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeAccess();});
retry.addEventListener('click',()=>location.reload());
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;clearTimeout(recoveryTimer);recovery=false;busy=true;submit.disabled=true;status.textContent='Connecting…';
  try{await enter(await apiClient.validate(input.value.trim()));}
  catch(error){show(delegated||apiClient.delegated?'Could not verify Hub access. Reconnect through NED Hub.':error.message,!delegated&&!apiClient.delegated&&['unauthorized','invalid_token'].includes(error.code));}
  finally{busy=false;submit.disabled=false;}
});
document.getElementById('access-forget').addEventListener('click',()=>{if(apiClient.forget())location.reload();else show('Access cleared for this tab. Clear this site’s browser storage to forget the saved token.');});
window.addEventListener('storage',event=>{if(event.key==='ned.instance-access.v1'&&event.newValue===null)apiClient.forget();});
async function restoreAccess(){
  if(busy)return;
  clearTimeout(recoveryTimer);
  const version=accessVersion;
  busy=true;submit.disabled=true;
  try{await enter(await apiClient.restore());recovery=false;}
  catch(error){
    if(version!==accessVersion)return;
    recovery=error.retryable===true;
    const hub=apiClient.delegated;
    const message=hub?'Could not verify Hub access.':error.message;
    if(recovery&&attempts<recoveryDelays.length)show(message+' Reconnecting automatically.',false);
    else show(hub?message+' Reconnect through NED Hub.':error.code==='unauthorized'?undefined:message,!hub&&error.code==='unauthorized');
  }finally{
    busy=false;submit.disabled=false;scheduleRecovery();
  }
}
busy=false;
await restoreAccess();
