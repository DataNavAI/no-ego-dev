import {secretShareRow,renderSecretCard} from './secret-share.js';
const LIMIT=65536;
const stringify=value=>typeof value==='string'?value:JSON.stringify(value,null,2) ?? '';
function decoded(value){
  if(typeof value!=='string'||value.length>LIMIT)return value;
  try{return JSON.parse(value);}catch{return value;}
}
export function messageParts(row){
  const share=secretShareRow(row);if(share)return [{kind:'secret-share',share}];
  if(row.role==='tool'&&(row.tool_name??row.name)==='ned')return [];
  const raw=stringify(row.content);
  const rawCalls=row.tool_calls===undefined?'':stringify(row.tool_calls);
  if(raw.length>LIMIT)return [{kind:'plain',text:raw},...(rawCalls?[{kind:'data',text:rawCalls}]:[])];
  const parts=[];
  const textKind='text';
  function visit(value,depth=0){
    if(depth>32){parts.push({kind:'data',text:stringify(value)});return;}
    if(typeof value==='string'){parts.push({kind:textKind,text:value});return;}
    if(Array.isArray(value)){for(const block of value)visit(block,depth+1);return;}
    if(value && typeof value==='object'){
      if(['text','input_text','output_text'].includes(value.type)&&typeof value.text==='string'){parts.push({kind:textKind,text:value.text});return;}
      if(['tool_use','tool_call','function'].includes(value.type)){
        parts.push({kind:'tool',name:String(value.name ?? value.function?.name ?? 'Tool'),label:'Arguments',text:stringify(decoded(value.input ?? value.arguments ?? value.function?.arguments ?? value))});return;
      }
      if(value.type==='tool_result'){
        parts.push({kind:'tool',name:String(value.name ?? row.tool_name ?? row.name ?? 'Tool'),label:'Output',text:stringify(decoded(value.content ?? value.output ?? value))});return;
      }
    }
    parts.push({kind:'data',text:stringify(value)});
  }
  const parsed=decoded(row.content);
  if(row.role==='user'&&!(Array.isArray(parsed)&&parsed.some(block=>block&&typeof block==='object'&&['text','tool_use','tool_result'].includes(block.type))))return [{kind:'text',text:raw}];
  if(row.role==='tool')parts.push({kind:'tool',name:String(row.tool_name ?? row.name ?? 'Tool'),label:'Output',text:stringify(decoded(row.content))});
  else {
    if(typeof parsed==='object'&&parsed!==null)visit(parsed);else visit(row.content);
  }
  const calls=rawCalls.length>LIMIT?rawCalls:decoded(row.tool_calls);
  if(Array.isArray(calls))for(const call of calls)visit(call&&typeof call==='object'?{...call,type:call.type ?? 'tool_call'}:call);
  else if(calls!==undefined&&calls!==null&&calls!=='')parts.push({kind:'data',text:stringify(calls)});
  return parts.length>100?[{kind:'plain',text:raw},...(rawCalls?[{kind:'data',text:rawCalls}]:[])]:parts;
}
export function renderMessageContent(row,document,libraries){
  const root=document.createElement('div');root.className='message-content';
  const author=row.role==='user'?'User':row.role==='tool'?'Tool':'Assistant';
  root.setAttribute?.('role','group');root.setAttribute?.('aria-label',`${author} message`);
  const parts=messageParts(row);
  for(const part of parts){
    if(part.kind==='secret-share'){root.append(renderSecretCard(part.share,document));}
    else if(part.kind==='tool'||part.kind==='data'){
      const details=document.createElement('details');const summary=document.createElement('summary');
      summary.textContent=part.kind==='tool'?`Tool: ${part.name}`:'Structured data';
      details.append(summary);
      if(part.label){const label=document.createElement('p');label.textContent=part.label;details.append(label);}
      const pre=document.createElement('pre');pre.textContent=part.text;details.append(pre);root.append(details);
    }else if(part.kind==='text'&&row.role!=='user'&&libraries){
      const section=document.createElement('div');section.className='markdown-content';
      try{
      const html=libraries.marked.parse(part.text,{async:false,gfm:true});
      const fragment=libraries.DOMPurify.sanitize(html,{
        ALLOWED_TAGS:['p','br','hr','strong','em','del','blockquote','h1','h2','h3','h4','h5','h6','ul','ol','li','pre','code','a','table','thead','tbody','tr','th','td'],
        ALLOWED_ATTR:['href','title','start'],RETURN_DOM_FRAGMENT:true,ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,
      });
      for(const link of fragment.querySelectorAll('a')){
        const href=link.getAttribute('href') ?? '';
        if(!/^https?:\/\//i.test(href))link.removeAttribute('href');
        else link.setAttribute('rel','noopener noreferrer');
      }
      section.append(fragment);root.append(section);
      }catch{const text=document.createElement('p');text.textContent=part.text;root.append(text);}
    }else {const text=document.createElement('p');text.textContent=part.text;root.append(text);}
  }
  const prose=parts.filter(part=>part.kind==='text').map(part=>part.text).join('\n\n');
  if(prose){
    const actions=document.createElement('div');actions.className='message-actions';
    const feedback=document.createElement('span');feedback.className='message-copy-status';feedback.setAttribute?.('role','status');feedback.setAttribute?.('aria-live','polite');
    const copy=document.createElement('button');copy.type='button';copy.className='message-copy';
    copy.setAttribute?.('aria-label','Copy message');copy.setAttribute?.('title','Copy message');
    copy.addEventListener('click',async()=>{
      try{
        if(!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');
        await globalThis.navigator.clipboard.writeText(prose);
        copy.dataset.state='copied';copy.setAttribute?.('aria-label','Message copied');feedback.textContent='Copied';
      }catch{
        copy.dataset.state='failed';copy.setAttribute?.('aria-label','Copy failed. Try again');feedback.textContent='Copy failed. Try again.';
      }
    });
    actions.append(feedback,copy);root.append(actions);
  }
  return root;
}
