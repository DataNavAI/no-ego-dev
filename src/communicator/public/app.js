import {initialState,beginLoad,settleLoad,selectProject,selectSection,beginDetail,settleDetail,view} from './state.js';
let state = initialState();
let retryFocusIntent = false;
const project = document.getElementById('project');
const retry = document.getElementById('retry');
const heading = document.getElementById('heading');
const announcement = document.getElementById('announcement');
function render() {
  const model = view(state); const retryFocused = document.activeElement === retry;
  heading.textContent = model.title; document.getElementById('message').textContent = model.body;
  document.getElementById('identity').textContent = [model.projectName,model.displayPath].filter(Boolean).join(' · ');
  const link=document.getElementById('open-app');link.hidden=!model.url;link.removeAttribute('href');if(model.url)link.href=model.url;document.getElementById('new-tab-note').hidden=!model.url;
  project.replaceChildren(new Option(state.status === 'loading' ? 'Loading projects…' : 'Projects',''));
  for (const row of state.projects) project.add(new Option([row.name,row.displayPath].filter(Boolean).join(' · '),row.id));
  project.value = state.projectId ?? ''; project.disabled = (state.status === 'loading' && !state.projects.length) || state.status === 'unavailable';
  for (const button of document.querySelectorAll('[data-section]')) {
    button.disabled = !state.projectId;
    if (state.projectId && button.dataset.section === state.section) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  }
  document.getElementById('navigation-hint').hidden = Boolean(state.projectId);
  retry.hidden = !model.retry; retry.disabled = state.status === 'loading' || state.detailLoading;
  document.getElementById('card').classList.toggle('error',Boolean(state.error) || state.detail?.preview?.status==='invalid' || state.detail?.preview?.status==='unavailable');
  announcement.setAttribute('role',state.error ? 'alert' : 'status');announcement.setAttribute('aria-live',state.error ? 'assertive' : 'polite');
  const text = `${model.title} ${model.body}`.trim(); if (announcement.textContent !== text) announcement.textContent = text;
  if (retry.hidden && (retryFocused || (retryFocusIntent && document.activeElement === document.body))) heading.focus();
  if (state.status !== 'loading' && !state.detailLoading) retryFocusIntent = false;
}
async function json(resource) {
  const response=await fetch(resource);const data=await response.json();if(!response.ok)throw Object.assign(new Error('Unavailable'),{code:data.error?.code});return data;
}
async function load() {
  const generation = state.requestGeneration;
  try {
    const capabilities=await json('/api/capabilities');
    const inventory=capabilities.capabilities?.projects ? await json('/api/projects') : {projects:[]};
    state=settleLoad(state,generation,{...capabilities,...inventory});
  } catch(error) {state=settleLoad(state,generation,null,error.code ?? 'inventory');}
  render();
  if(generation===state.requestGeneration && state.projectId && !state.error){state=beginDetail(state);render();void loadDetail();}
}
async function loadDetail() {
  const generation=state.requestGeneration;const id=state.projectId;
  try {state=settleDetail(state,generation,await json('/api/projects/'+encodeURIComponent(id)));}
  catch(error){state=settleDetail(state,generation,null,error.code ?? 'inventory');}
  render();
}
retry.addEventListener('click',() => {
  const next=state.projectId ? beginDetail(state) : beginLoad(state);if(next===state)return;
  retryFocusIntent=document.activeElement===retry;state=next;render();void (state.projectId ? loadDetail() : load());
});
project.addEventListener('change',() => {state=selectProject(state,project.value);render();if(state.projectId)void loadDetail();});
for (const button of document.querySelectorAll('[data-section]')) button.addEventListener('click',() => {state = selectSection(state,button.dataset.section); render();});
render(); void load();
