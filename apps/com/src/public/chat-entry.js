import {mountIdleActivity} from './idle-activity.js';
import {mountChat} from './chat-ui.js';
import {apiFetch,ApiEventSource} from './api-client.js';
import {mountActivity} from './activity-ui.js';
import {mountPaneResize} from './pane-resize.js';
import {mountDebugPane} from './debug-pane.js';
import {marked} from '/vendor/marked.js';
import DOMPurify from '/vendor/dompurify.js';
mountDebugPane({document,request:apiFetch});
let hasDraft=false;
const idleActivity=mountIdleActivity({document,request:apiFetch,hasDraft:()=>hasDraft});
mountChat({marked,DOMPurify,idleActivity:{changed:value=>{hasDraft=value.hasDraft;idleActivity.changed();}}});
mountActivity({document,EventSource:ApiEventSource});
mountPaneResize({shell:document.getElementById('app-shell'),divider:document.getElementById('pane-divider')});

const viewport=globalThis.visualViewport;
if(viewport){
  const shell=document.getElementById('app-shell');
  const mobile=matchMedia('(max-width: 767px)');
  const fitVisibleViewport=()=>{
    if(mobile.matches&&viewport.scale===1&&viewport.height>0){
      shell.style.setProperty('--chat-viewport-height',`${Math.floor(viewport.height)}px`);
      shell.style.setProperty('--chat-viewport-top',`${Math.max(0,viewport.offsetTop)}px`);
      shell.dataset.fitViewport='true';
      shell.toggleAttribute('data-compact-chat',viewport.height<340);
      const editing=Boolean(globalThis.document.activeElement?.matches('input,textarea,[contenteditable="true"]'));
      shell.toggleAttribute('data-keyboard-open',viewport.height<globalThis.innerHeight-120||editing&&viewport.height<500);
    }else{
      shell.style.removeProperty('--chat-viewport-height');
      shell.style.removeProperty('--chat-viewport-top');
      delete shell.dataset.fitViewport;
      shell.removeAttribute('data-compact-chat');
      shell.removeAttribute('data-keyboard-open');
    }
  };
  globalThis.document.addEventListener('focusin',fitVisibleViewport);
  globalThis.document.addEventListener('focusout',()=>globalThis.requestAnimationFrame(fitVisibleViewport));
  viewport.addEventListener('resize',fitVisibleViewport);
  viewport.addEventListener('scroll',fitVisibleViewport);
  mobile.addEventListener('change',fitVisibleViewport);
  fitVisibleViewport();
}
