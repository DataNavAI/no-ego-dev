import {reactionEmoji} from './reaction-emoji.js';

export function renderReaction(row,document,request,sessionId='nedcom-main'){
  const menu=document.createElement('details');
  menu.className='message-reaction';
  const toggle=document.createElement('summary');
  const options=document.createElement('div');
  options.className='reaction-options';
  const notice=document.createElement('span');
  notice.setAttribute('role','status');
  notice.className='reaction-notice';
  let selected=row.reaction;
  const buttons=new Map();
  function render(){
    toggle.textContent=selected??'☺';
    toggle.setAttribute('aria-label',selected?`Change reaction, ${reactionEmoji[selected]} selected`:'Add reaction');
    for(const [emoji,button] of buttons)button.setAttribute('aria-pressed',String(selected===emoji));
  }
  for(const [emoji,label] of Object.entries(reactionEmoji)){
    const button=document.createElement('button');
    button.type='button';button.textContent=emoji;button.setAttribute('aria-label',label);
    button.addEventListener('click',async()=>{
      const next=selected===emoji?null:emoji;
      for(const item of buttons.values())item.disabled=true;
      notice.textContent='';
      try{
        const response=await request(`/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/reactions`,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message_id:String(row.id),target:row.reaction_target,emoji:next}),
          signal:AbortSignal.timeout(10000),
        });
        if(!response.ok||(await response.json()).reaction!==next)throw new Error();
        selected=next;row.reaction=next;render();
        if(menu.open){menu.open=false;toggle.focus();}
      }catch{
        notice.textContent='Could not save reaction. Try again.';
      }finally{
        for(const item of buttons.values())item.disabled=false;
        if(menu.open&&notice.textContent)button.focus();
      }
    });
    buttons.set(emoji,button);options.append(button);
  }
  menu.addEventListener('toggle',()=>{
    if(menu.open)options.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.open){event.stopPropagation();menu.open=false;toggle.focus();}
  });
  render();menu.append(toggle,options,notice);
  return menu;
}
