import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {validateMessagePage} from '../../../../src/communicator/public/history.js';

export async function chatHarness({reducedMotion=false}={}) {
  const document={activeElement:null};
  const elements=new Map();
  function node(id='') {
    const listeners=new Map();
    const element={id,value:'',disabled:false,hidden:false,dataset:{},children:[],clientHeight:400,scrollTop:0,scrollCalls:[],
      get options(){return this.children;},
      get firstElementChild(){return this.children[0];},
      get scrollHeight(){return this.children.length*100;},
      get textContent(){return this.text ?? this.children.map(child=>child.textContent).join('');},
      set textContent(value){this.text=String(value);this.children=[];},
      append(...children){for(const child of children){child.parent=this;this.children.push(child);}},
      replaceChildren(...children){this.children=[];this.text=undefined;this.append(...children);},
      add(child){this.append(child);},
      focus(){if(!this.disabled)document.activeElement=this;},
      scrollTo(options){this.scrollCalls.push(options);this.scrollTop=Math.max(0,this.scrollHeight-this.clientHeight);},
      getBoundingClientRect(){return {top:(this.parent?.children.indexOf(this) ?? 0)*100-(this.parent?.scrollTop ?? 0)};},
      addEventListener(event,listener){listeners.set(event,listener);},
      dispatch(event){listeners.get(event)?.({preventDefault(){}});},
    };
    if(id)elements.set(id,element);return element;
  }
  const shell=node();
  for(const id of ['transcript','sessions','chat-status','chat-message','new-chat','more-sessions','older','newer','latest','chat-send','chat-retry','chat-form','mobile-view'])node(id);
  document.getElementById=id=>elements.get(id);
  document.createElement=()=>node();
  document.querySelector=()=>shell;
  const requests=[];
  const fetch=(url,options)=>new Promise(resolve=>requests.push({url,options,resolve}));
  const source=await readFile(new URL('../../../../src/communicator/public/chat-ui.js',import.meta.url),'utf8');
  runInNewContext(source.replace(/^import[^\n]+\n/,'').replaceAll('export function ','function ')+'\nmountChat();',{document,fetch,validateMessagePage,Option:class{constructor(label,value){this.textContent=label;this.value=value;}},encodeURIComponent,AbortSignal,matchMedia:()=>({matches:reducedMotion})});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  async function respond(data,status=200){const request=requests.shift();if(!request)throw new Error('Expected pending chat request');request.resolve({ok:status>=200&&status<300,json:async()=>data});await flush();return request;}
  async function select(id,data){elements.get('sessions').value=id;elements.get('sessions').dispatch('change');await respond({data});}
  return {elements,document,shell,requests,respond,select,flush};
}
