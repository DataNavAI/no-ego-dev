import {initialState,beginLoad,settleLoad,selectProject,selectSection,view} from './state.js';
let state = initialState();
let retryFocusIntent = false;
const project = document.getElementById('project');
const retry = document.getElementById('retry');
const heading = document.getElementById('heading');
const announcement = document.getElementById('announcement');
function render() {
  const model = view(state); const retryFocused = document.activeElement === retry;
  heading.textContent = model.title; document.getElementById('message').textContent = model.body;
  document.getElementById('identity').textContent = model.projectName;
  project.replaceChildren(new Option(state.status === 'loading' ? 'Loading projects…' : 'Projects',''));
  for (const row of state.projects) project.add(new Option(row.name,row.id));
  project.value = state.projectId ?? ''; project.disabled = state.status === 'loading' || state.status === 'unavailable';
  for (const button of document.querySelectorAll('[data-section]')) {
    button.disabled = !state.projectId;
    if (state.projectId && button.dataset.section === state.section) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  }
  document.getElementById('navigation-hint').hidden = Boolean(state.projectId);
  retry.hidden = !model.retry; retry.disabled = state.status === 'loading';
  document.getElementById('card').classList.toggle('error',Boolean(state.error));
  const text = `${model.title} ${model.body}`.trim(); if (announcement.textContent !== text) announcement.textContent = text;
  if (retry.hidden && (retryFocused || (retryFocusIntent && document.activeElement === document.body))) heading.focus();
  if (state.status !== 'loading') retryFocusIntent = false;
}
async function load() {
  const generation = state.requestGeneration;
  try { const response = await fetch('/api/capabilities'); if (!response.ok) throw new Error('Unavailable'); state = settleLoad(state,generation,await response.json()); }
  catch { state = settleLoad(state,generation,null,'inventory'); }
  render();
}
retry.addEventListener('click',() => {const next = beginLoad(state); if (next === state) return; retryFocusIntent = document.activeElement === retry; state = next; render(); void load();});
project.addEventListener('change',() => {state = selectProject(state,project.value); render();});
for (const button of document.querySelectorAll('[data-section]')) button.addEventListener('click',() => {state = selectSection(state,button.dataset.section); render();});
render(); void load();
