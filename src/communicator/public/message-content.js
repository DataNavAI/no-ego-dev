import {secretShareRow,renderSecretCard} from './secret-share.js';
const LIMIT=4*1024*1024;
const toolEnvelope=value=>/^\s*[[{]\s*\{?\s*"(?:tool_calls?|tool_use|tool_result|function_call)"\s*:/.test(value)||/^\s*[[{]\s*\{?\s*"type"\s*:\s*"(?:tool_|function)/.test(value);
function literalLinks(text,document){
  const paragraph=document.createElement('p');
  const pattern=/\[((?:\\.|[^\]\\\n]){1,1000})\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>]+/g;
  let offset=0;
  for(const match of text.matchAll(pattern)){
    const plain=document.createElement('span');plain.textContent=text.slice(offset,match.index);paragraph.append(plain);
    let url;try{url=new URL(match[2] ?? match[0]);}catch{url=null;}
    const link=document.createElement(url&&!url.username&&!url.password?'a':'span');link.textContent=match[1]?.replace(/\\([\\[\]])/g,'$1') ?? match[0];
    if(url&&!url.username&&!url.password){link.setAttribute('href',url.href);link.setAttribute('rel','noopener noreferrer');}
    paragraph.append(link);offset=match.index+match[0].length;
  }
  const tail=document.createElement('span');tail.textContent=text.slice(offset);paragraph.append(tail);return paragraph;
}
const stringify=value=>typeof value==='string'?value:JSON.stringify(value,null,2) ?? '';
export function messageParts(row){
  const share=secretShareRow(row);if(share)return [{kind:'secret-share',share}];
  if(!['user','assistant'].includes(row.role))return [];
  let value=row.content;
  if(typeof value==='string'&&/^\s*[[{]/.test(value)){
    if(value.length>LIMIT)return row.role==='user'||!toolEnvelope(value)?[{kind:'text',text:value}]:[];
    try{value=JSON.parse(value);}catch{return row.role==='assistant'&&toolEnvelope(value)?[]:[{kind:'text',text:value}];}
  }
  if(row.role==='user'&&!Array.isArray(value))return [{kind:'text',text:stringify(row.content)}];
  const parts=[];
  let visited=0;
  function visit(value,depth=0){
    if(depth>32||++visited>1000)return;
    if(typeof value==='string'){if(value.trim())parts.push({kind:'text',text:value});return;}
    if(Array.isArray(value)){for(const block of value)visit(block,depth+1);return;}
    if(value && typeof value==='object'){
      if(['text','input_text','output_text'].includes(value.type)&&typeof value.text==='string'&&value.text.trim())parts.push({kind:'text',text:value.text});
    }
  }
  if(row.role==='user'&&Array.isArray(value)&&!value.some(block=>block&&typeof block==='object'&&['text','input_text','output_text','tool_use','tool_result','tool_call'].includes(block.type)))return [{kind:'text',text:stringify(row.content)}];
  visit(value);
  return parts;
}
export function renderMessageContent(row,document,libraries){
  const root=document.createElement('div');root.className='message-content';
  const author=row.role==='user'?'User':'Assistant';
  root.setAttribute?.('role','group');root.setAttribute?.('aria-label',`${author} message`);
  const parts=messageParts(row);
  for(const part of parts){
    if(part.kind==='secret-share'){root.append(renderSecretCard(part.share,document));continue;}
    if(part.kind==='text'&&row.role!=='user'&&libraries){
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
    }else if(part.kind==='text'&&row.role==='user'&&document.createElement('span').setAttribute)root.append(literalLinks(part.text,document));
    else {const text=document.createElement('p');text.textContent=part.text;root.append(text);}
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
