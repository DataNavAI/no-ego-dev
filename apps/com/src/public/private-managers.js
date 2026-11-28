for(const [id,triggerId] of [['provider-manager','connections-toggle'],['secret-manager','secrets-toggle']]){
 const dialog=document.getElementById(id),trigger=document.getElementById(triggerId);if(!dialog||!trigger)continue;
 const shut=()=>{if(dialog.open)dialog.close();dialog.hidden=true;for(const field of dialog.querySelectorAll('input[type=password],textarea'))field.value='';};
 trigger.addEventListener('click',()=>{dialog.hidden=false;dialog.showModal();});
 dialog.querySelector('[data-close-manager]').addEventListener('click',shut);
 dialog.addEventListener('cancel',event=>{event.preventDefault();shut();});
 dialog.addEventListener('close',()=>{dialog.hidden=true;for(const field of dialog.querySelectorAll('input[type=password],textarea'))field.value='';const active=document.activeElement;if(!document.getElementById('app-shell').hidden&&(active===document.body||active===dialog||dialog.contains(active)||active===trigger))trigger.focus();});
 document.addEventListener('ned-auth-lost',shut);
}
