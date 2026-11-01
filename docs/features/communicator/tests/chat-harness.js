import {mountTaskReferences} from '../../../../src/communicator/public/task-references.js';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {validateMessagePage} from '../../../../src/communicator/public/history.js';
import {renderMessageContent,messageParts} from '../../../../src/communicator/public/message-content.js';
import {mountComposerMedia} from '../../../../src/communicator/public/composer-media.js';
import {consumeTurnStream} from '../../../../src/communicator/public/turn-stream.js';
import {recordChatDiagnostic,recordRequestDiagnostic} from '../../../../src/communicator/public/debug-pane.js';
import {classifyFailureBody,readFailureBody} from '../../../../src/communicator/public/request-diagnostic.js';

export async function chatHarness({reducedMotion=false,media=false,references=false}={}) {
  const documentListeners=new Map();const document={activeElement:null,addEventListener(type,handler){documentListeners.set(type,handler);},dispatchEvent(event){documentListeners.get(event.type)?.(event);}};
  const elements=new Map();
  function node(id='') {
    const listeners=new Map();
    const element={id,value:'',disabled:false,hidden:false,dataset:{},style:{},children:[],attributes:{},clientHeight:400,scrollTop:0,scrollCalls:[],
      setAttribute(name,value){this.attributes[name]=String(value);},
      setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;},
      click(){this.dispatch('click');},
      get options(){return this.children;},
      get firstElementChild(){return this.children[0];},
      get scrollHeight(){return this.measuredScrollHeight ?? this.children.length*100;},
      get textContent(){return this.text ?? this.children.map(child=>child.textContent).join('');},
      set textContent(value){this.text=String(value);this.children=[];},
      append(...children){for(const child of children){child.parent=this;this.children.push(child);}},
      replaceChildren(...children){this.children=[];this.text=undefined;this.append(...children);},
      add(child){this.append(child);},
      focus(){if(!this.disabled)document.activeElement=this;},
      scrollTo(options){this.scrollCalls.push(options);this.scrollTop=Math.max(0,this.scrollHeight-this.clientHeight);},
      getBoundingClientRect(){return {top:(this.parent?.children.indexOf(this) ?? 0)*100-(this.parent?.scrollTop ?? 0)};},
      addEventListener(event,listener){listeners.set(event,listener);},
      dispatch(event,details={}){const dispatched={preventDefault(){this.defaultPrevented=true;},...details};listeners.get(event)?.(dispatched);return dispatched;},
      requestSubmit(){this.dispatch('submit');},
    };
    if(id)elements.set(id,element);return element;
  }
  const shell=node();
  for(const id of ['transcript','chat-status','chat-message','older','newer','latest','chat-send','chat-retry','chat-form'])node(id);
  if(references)for(const id of ['chat-task-references','chat-reference-status','mobile-sidebar-toggle'])node(id);
  if(media)for(const id of ['chat-files','chat-attach','chat-add-link','chat-link-editor','chat-link-url','chat-link-label','chat-link-insert','chat-link-cancel','chat-link-error','chat-attachments','chat-attachment-status'])node(id);
  document.getElementById=id=>elements.get(id);
  document.createElement=()=>node();
  document.querySelector=()=>shell;
  const requests=[];
  const fetch=(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}));
  const source=await readFile(new URL('../../../../src/communicator/public/chat-ui.js',import.meta.url),'utf8');
  const timers=[];
  runInNewContext(source.replace(/^import[^\n]+\n/gm,'').replaceAll('export function ','function ')+'\nmountChat();',{document,fetch,validateMessagePage,renderMessageContent,messageParts,mountComposerMedia,mountTaskReferences,consumeTurnStream,recordChatDiagnostic,recordRequestDiagnostic,classifyFailureBody,readFailureBody,setTimeout:(callback,delay)=>timers.push({callback,delay}),Option:class{constructor(label,value){this.textContent=label;this.value=value;}},encodeURIComponent,AbortSignal,matchMedia:()=>({matches:reducedMotion})});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  let streaming;
  async function respond(data,status=200){
    if(streaming||requests[0]?.url.endsWith('/events')){
      let request;
      if(!streaming){request=requests.shift();const body=new ReadableStream({start(controller){streaming=controller;}});request.resolve(new Response(body,{status,headers:{'content-type':'text/event-stream'}}));}
      if(data.activity)streaming.enqueue(new TextEncoder().encode(`event: activity\ndata: ${JSON.stringify(data.activity)}\n\n`));
      if(data.stream)streaming.enqueue(new TextEncoder().encode(`event: delta\ndata: ${JSON.stringify(data.stream)}\n\n`));
      if(data.turn?.status!=='pending'){
        streaming.enqueue(new TextEncoder().encode(`event: terminal\ndata: ${JSON.stringify({...data,message:data.message?{role:'assistant',...data.message}:undefined})}\n\n`));streaming.close();streaming=undefined;
      }
      await flush();return request;
    }
    const request=requests.shift();if(!request)throw new Error('Expected pending chat request');request.resolve(new Response(JSON.stringify(data),{status}));await flush();return request;
  }
  return {elements,document,shell,requests,respond,flush,delays:()=>timers.map(timer=>timer.delay),async fail(error){const request=requests.shift();if(!request)throw new Error('Expected pending chat request');request.reject(error);await flush();},async tick(){timers.shift()?.callback();await flush();}};
}
