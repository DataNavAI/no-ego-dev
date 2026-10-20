import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as state from '../../../../src/communicator/public/state.js';

// Run the shipped client with its real state model; defer only the HTTP boundary.
export async function clientHarness() {
  const document = { body: {}, activeElement: null };
  document.activeElement = document.body;
  const elements = new Map();
  function element(id) {
    const listeners = new Map();
    let disabled = false, hidden = false;
    const blur = () => { if (document.activeElement === node) document.activeElement = document.body; };
    const node = {
      id, dataset: {}, value: '', textContent: '', classList: { toggle() {} },
      set disabled(value) { disabled = value; if (value) blur(); }, get disabled() { return disabled; },
      set hidden(value) { hidden = value; if (value) blur(); }, get hidden() { return hidden; },
      focus() { if (!disabled && !hidden) document.activeElement = node; },
      setAttribute() {}, removeAttribute() {}, replaceChildren() {}, add() {},
      addEventListener(type, callback) { listeners.set(type, callback); },
      dispatch(type) { listeners.get(type)?.(); },
    };
    elements.set(id, node); return node;
  }
  for (const id of ['project','retry','heading','announcement','message','identity','open-app','new-tab-note','navigation-hint','card']) element(id);
  const sections = ['Tasks','Artifacts','WIP app'].map(name => { const node = element(name); node.dataset.section = name; return node; });
  document.getElementById = id => elements.get(id);
  document.querySelectorAll = () => sections;
  const requests = [];
  const fetch = url => new Promise(resolve => requests.push({ url, resolve }));
  const source = await readFile(new URL('../../../../src/communicator/public/app.js', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import[^\n]+\n/, ''), { ...state, document, fetch, Option: class {}, encodeURIComponent });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  async function respond(data, status = 200) {
    const request = requests.shift();
    if (!request) throw new Error('Expected pending request');
    request.resolve({ ok: status === 200, json: async () => data }); await flush();
  }
  await respond({ capabilities: { projects: true } });
  await respond({ projects: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }] });
  const project = elements.get('project'); project.value = 'a'; project.dispatch('change');
  await respond({ preview: { status: 'unconfigured' } });
  elements.get('WIP app').dispatch('click');
  return { elements, document, requests, respond };
}
