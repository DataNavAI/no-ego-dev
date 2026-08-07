const variant = document.body.dataset.variant;
const screens = ['entry', 'auth', 'progress', 'failure', 'ready', 'resume', 'destroy'];
const ids = { a: 'UI-01', b: 'UI-02', c: 'UI-03' };
const names = { a: 'Guided setup', b: 'Focused setup', c: 'Workspace lobby' };
const copy = {
  a: { title: 'Create your private NED', desc: 'Sign in, connect the required services, then create your workspace.' },
  b: { title: 'Create your private NED', desc: 'Complete one setup step at a time.' },
  c: { title: 'Create and return to your NED workspace', desc: 'Create one workspace, use it, and return later.' },
}[variant];
const qs = new URLSearchParams(location.search);
let current = qs.get('state') || 'entry';
let signedIn = current === 'storyboard';
let computeConnected = current === 'storyboard';
let modelConnected = current === 'storyboard';
let requestPhase = 'empty';
let deletionPhase = 'confirm';

function provider(name, detail, connected, id, action) {
  return `<div class="provider" data-hotspot="${id}">
    <div class="icon" aria-hidden="true">${name[0]}</div>
    <div class="provider-copy"><strong>${name}</strong><div class="meta">${detail}</div></div>
    ${connected ? '<span class="badge">Connected</span>' : `<button class="ghost" data-provider="${action}">Connect ${name}</button>`}
  </div>`;
}

function entry() {
  return `<section class="screen" data-id="SCREEN-01"><div class="card stack">
    <h2 tabindex="-1">Sign in to create your NED</h2>
    <p class="muted">Your account keeps setup progress and workspace access tied to you.</p>
    <button class="primary" data-sign-in data-hotspot="A3">Sign in to continue</button>
  </div></section>`;
}

function auth() {
  const canCreate = computeConnected && modelConnected;
  return `<section class="screen" data-id="SCREEN-02"><div class="card stack">
    <h2 tabindex="-1">Connect services</h2>
    ${provider('NED compute', 'Managed by NED during the limited beta.', computeConnected, 'A1', 'compute')}
    ${provider('OpenRouter', 'Lets NED use models for your requests.', modelConnected, 'A2', 'model')}
    <div class="notice">Provider credentials are stored on NED’s servers—not in chat, URLs, or analytics.</div>
    <div class="row"><button class="ghost" data-next="entry">Sign out</button><button class="primary" data-next="progress" data-hotspot="A5" ${canCreate ? '' : 'disabled'}>Create my NED</button></div>
  </div></section>`;
}

function progress() {
  return `<section class="screen" data-id="SCREEN-03"><div class="card stack" aria-live="polite">
    <span class="eyebrow">Safe to close</span><h2 tabindex="-1">Creating your NED</h2>
    <div class="steps">
      <div class="step done"><span class="dot">✓</span><div><strong>Provider access confirmed</strong></div></div>
      <div class="step done"><span class="dot">✓</span><div><strong>Workspace created</strong></div></div>
      <div class="step doing"><span class="dot">3</span><div><strong>Installing NED</strong></div><span class="badge">Working</span></div>
      <div class="step"><span class="dot">4</span><div><strong>Checking that NED can respond</strong></div></div>
    </div>
    <div class="notice">You can close this page. We’ll save your progress.</div>
    <div class="prototype-controls"><button class="ghost" data-next="failure">Preview failure</button><button class="ghost" data-next="ready">Preview ready</button></div>
  </div></section>`;
}

function failure() {
  return `<section class="screen" data-id="SCREEN-04"><div class="card stack">
    <span class="eyebrow warning-label">Setup failed</span><h2 tabindex="-1">We couldn’t create your NED</h2>
    <div class="notice warn">The health check failed, so the incomplete workspace was deleted. No compute is running.</div>
    <p class="muted">OpenRouter didn’t respond during the model check.</p>
    <div class="row"><a class="link" href="#" data-details>View details</a><button class="primary" data-next="progress" data-hotspot="A6">Create NED again</button></div>
  </div></section>`;
}

function ready() {
  const response = requestPhase === 'sending'
    ? '<div class="answer" role="status"><strong>NED is working…</strong></div>'
    : requestPhase === 'success'
      ? '<div class="answer" role="status"><strong>Request completed</strong><br>I’ll clarify the user and the smallest outcome worth testing, then create something you can review.</div>'
      : requestPhase === 'failure'
        ? '<div class="notice warn" role="alert">NED couldn’t complete this request. Try again.</div>'
        : '';
  return `<section class="screen" data-id="SCREEN-05"><div class="card stack">
    <h2 tabindex="-1">Send your first request</h2>
    <label for="prompt-${variant}"><strong>Request</strong></label>
    <input id="prompt-${variant}" class="prompt" placeholder="Describe what you want to build" data-hotspot="A7">
    <div class="row"><span class="meta">Prompt and response content are not sent to analytics.</span><button class="primary" data-send data-hotspot="A8" ${requestPhase === 'sending' ? 'disabled' : ''}>Send to NED</button></div>
    ${response}
    ${requestPhase === 'success' ? '<button class="ghost" data-next="resume">Preview returning later</button>' : ''}
  </div></section>`;
}

function resume() {
  return `<section class="screen" data-id="SCREEN-06"><div class="card stack">
    <h2 tabindex="-1">Your workspace is stopped</h2>
    <p class="muted">Resume this workspace to continue where you left off. This won’t create a new one.</p>
    <div class="row"><button class="ghost" data-next="destroy">Delete NED</button><button class="primary" data-next="ready" data-hotspot="A9">Resume NED</button></div>
  </div></section>`;
}

function destroy() {
  const pending = deletionPhase === 'deleting' ? '<div class="notice" role="status">Deleting NED… Keep this page open while we delete the workspace.</div>' : '';
  const failed = deletionPhase === 'failed' ? '<div class="notice warn" role="alert">We couldn’t delete your NED. Your workspace and provider connections are unchanged.</div>' : '';
  const success = deletionPhase === 'deleted' ? '<div class="notice" role="status">NED deleted. Your provider connections are still active.</div>' : '';
  return `<section class="screen" data-id="SCREEN-07"><div class="card modal stack">
    <h2 tabindex="-1">Delete this NED?</h2>
    <p class="muted">This permanently deletes this workspace and all projects in it. This can’t be undone. Your provider connections won’t be revoked.</p>
    <label class="check"><input type="checkbox" data-confirm-delete data-hotspot="A10"><span>I understand this permanently deletes all workspace files and projects.</span></label>
    ${pending}${failed}${success}
    <div class="row"><button class="ghost" data-next="resume">Cancel</button><button class="primary danger" data-delete data-hotspot="A11" disabled>Delete NED permanently</button></div>
    <div class="prototype-controls"><button class="ghost" data-delete-failure>Preview deletion failure</button></div>
  </div></section>`;
}

const renderScreen = { entry, auth, progress, failure, ready, resume, destroy };
function header() { return '<header class="topbar"><div class="brand"><span class="mark">N</span>NED</div></header>'; }
function statebar() { return `<nav class="statebar prototype-controls" aria-label="Prototype states">${screens.map(s => `<button data-state="${s}" aria-pressed="${current === s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</nav>`; }
function render() {
  const all = current === 'storyboard';
  const stages = all ? screens.map(s => renderScreen[s]()).join('') : renderScreen[current]?.() || entry();
  document.body.innerHTML = header() + `<main class="shell"><div class="hero"><span class="eyebrow">${ids[variant]} · ${names[variant]}</span><h1>${copy.title}</h1><p>${copy.desc}</p></div>${statebar()}<div class="workspace">${variant === 'c' ? '<aside class="rail card"><strong>Future workspace navigation</strong><span class="meta">Not part of beta setup</span></aside>' : ''}<div class="${all ? 'storyboard' : 'stage'}">${all ? stages : stages.replace('class="screen"', 'class="screen active"')}</div></div></main>`;
  wire();
  if (!all) document.querySelector('.screen.active h2')?.focus({ preventScroll: true });
}
function go(state) {
  current = state;
  if (state === 'ready') requestPhase = 'empty';
  const url = new URL(location);
  url.searchParams.set('state', state);
  history.replaceState({}, '', url);
  render();
}
function wire() {
  document.querySelectorAll('[data-state]').forEach(el => { el.onclick = () => go(el.dataset.state); });
  document.querySelectorAll('[data-next]').forEach(el => { el.onclick = () => go(el.dataset.next); });
  document.querySelector('[data-sign-in]')?.addEventListener('click', () => { signedIn = true; go('auth'); });
  document.querySelectorAll('[data-provider]').forEach(el => { el.onclick = () => { if (el.dataset.provider === 'compute') computeConnected = true; if (el.dataset.provider === 'model') modelConnected = true; render(); }; });
  document.querySelector('[data-send]')?.addEventListener('click', () => { requestPhase = 'sending'; render(); setTimeout(() => { requestPhase = 'success'; render(); }, 650); });
  const confirmation = document.querySelector('[data-confirm-delete]');
  const deleteButton = document.querySelector('[data-delete]');
  if (confirmation && deleteButton) confirmation.onchange = () => { deleteButton.disabled = !confirmation.checked; };
  deleteButton?.addEventListener('click', () => { deletionPhase = 'deleting'; render(); setTimeout(() => { deletionPhase = 'deleted'; render(); }, 650); });
  document.querySelector('[data-delete-failure]')?.addEventListener('click', () => { deletionPhase = 'failed'; render(); });
  document.querySelector('[data-details]')?.addEventListener('click', event => event.preventDefault());
}
render();
