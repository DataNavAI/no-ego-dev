import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const clientSource = await readFile(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');

class FakeClassList {
  #classes = new Set();
  toggle(name, force) {
    if (force === undefined ? !this.#classes.has(name) : force) this.#classes.add(name);
    else this.#classes.delete(name);
  }
  contains(name) { return this.#classes.has(name); }
}

class FakeElement {
  constructor(document, id, { tagName = 'DIV', checked = false, value = '' } = {}) {
    this.ownerDocument = document;
    this.id = id;
    this.tagName = tagName;
    this.hidden = false;
    this.disabled = false;
    this.checked = checked;
    this.value = value;
    this.textContent = '';
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.heading = null;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  async dispatch(type, extra = {}) {
    if (type === 'click') this.focus();
    return this.listeners.get(type)?.({ target: this, preventDefault() {}, ...extra });
  }
  focus() { this.ownerDocument.activeElement = this; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  querySelector(selector) { return selector === 'h2' ? this.heading : null; }
}

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(body); },
  };
}

function createHarness({ width = 1440, fetchImpl, controlledTimers = false } = {}) {
  const elements = new Map();
  const document = { activeElement: null };
  const add = (id, options) => {
    const element = new FakeElement(document, id, options);
    elements.set(id, element);
    return element;
  };
  const panelIds = ['sign-in-panel', 'compute-panel', 'model-panel', 'create-panel', 'request-panel'];
  for (const [index, id] of panelIds.entries()) {
    const panel = add(id);
    panel.hidden = index !== 0;
    panel.heading = add(`${id}-heading`, { tagName: 'H2' });
  }
  for (const id of [
    'status', 'notice', 'sign-in-button', 'compute-button', 'credential-fields', 'delegated-note',
    'model-button', 'model-credential', 'create-button', 'cancel-button', 'request-button',
    'first-response', 'first-message', 'resume-button', 'destroy-button', 'destroy-confirm',
  ]) add(id);
  elements.get('cancel-button').hidden = true;
  elements.get('request-button').disabled = true;
  elements.get('resume-button').disabled = true;
  elements.get('destroy-button').disabled = true;
  const providers = ['openai', 'anthropic', 'gemini', 'openrouter'].map((value, index) =>
    add(`provider-${value}`, { tagName: 'INPUT', value, checked: index === 0 }));
  const steps = Array.from({ length: 5 }, (_, index) => add(`step-${index + 1}`, { tagName: 'LI' }));
  document.getElementById = (id) => elements.get(id) || null;
  document.querySelectorAll = (selector) => {
    if (selector === '.steps li') return steps;
    if (selector === 'input[name="provider"]') return providers;
    return [];
  };
  document.querySelector = (selector) => {
    if (selector === 'input[name="provider"]:checked') return providers.find(({ checked }) => checked);
    return null;
  };

  const timers = [];
  const setTimeout = controlledTimers
    ? (callback) => { timers.push(callback); return timers.length; }
    : (callback) => { queueMicrotask(callback); return 1; };
  const context = {
    document,
    fetch: fetchImpl,
    crypto: { randomUUID: (() => { let id = 0; return () => `runtime-key-${++id}`; })() },
    setTimeout,
    clearTimeout() {},
    console,
    URL,
    encodeURIComponent,
    window: { innerWidth: width },
    structuredClone,
  };
  runInNewContext(clientSource, context, { filename: 'src/web/public/app.js' });
  return {
    document,
    elements,
    async flush() { await new Promise((resolve) => setImmediate(resolve)); },
    async flushTimer() {
      const callback = timers.shift();
      assert.ok(callback, 'expected a pending poll timer');
      callback();
      await this.flush();
    },
  };
}

for (const width of [1440, 390, 320]) {
  test(`guided transitions focus destination headings without polling focus theft at ${width}px`, async () => {
    const requests = [];
    let createOutcome = 'succeeded';
    const fetchImpl = async (path, options = {}) => {
      requests.push({ path, method: options.method || 'GET' });
      if (path === '/api/session' && !options.method) return response(401, { error: 'authentication_required' });
      if (path === '/api/session' && options.method === 'POST') return response(201, { csrfToken: 'csrf' });
      if (path === '/api/compute-connections') return response(201, { status: 'connected' });
      if (path === '/api/model-connections') return response(201, { status: 'connected' });
      if (path === '/api/jobs' && JSON.parse(options.body).operation === 'create_ned') {
        return response(202, { id: `create-${createOutcome}`, operation: 'create_ned', status: createOutcome });
      }
      if (path === '/api/jobs' && JSON.parse(options.body).operation === 'destroy_ned') {
        return response(202, { id: 'destroy-success', operation: 'destroy_ned', status: 'succeeded' });
      }
      if (path === '/api/jobs/create-queued') {
        return response(200, { id: 'create-queued', operation: 'create_ned', status: createOutcome });
      }
      throw new Error(`unexpected request ${options.method || 'GET'} ${path}`);
    };
    const harness = createHarness({ width, fetchImpl, controlledTimers: true });
    await harness.flush();
    assert.equal(harness.document.activeElement, harness.elements.get('sign-in-panel-heading'));

    await harness.elements.get('sign-in-button').dispatch('click');
    assert.equal(harness.document.activeElement, harness.elements.get('compute-panel-heading'));
    await harness.elements.get('compute-button').dispatch('click');
    assert.equal(harness.document.activeElement, harness.elements.get('model-panel-heading'));
    harness.elements.get('model-credential').value = 'runtime-only-secret';
    await harness.elements.get('model-button').dispatch('click');
    assert.equal(harness.document.activeElement, harness.elements.get('create-panel-heading'));

    const createButton = harness.elements.get('create-button');
    createButton.focus();
    createOutcome = 'queued';
    const pendingCreate = createButton.dispatch('click');
    await harness.flush();
    assert.equal(harness.document.activeElement, createButton, 'polling must not steal focus');
    assert.equal(createButton.getAttribute('aria-disabled'), 'true');
    const createSubmissions = requests.filter(({ path, options }) => path === '/api/jobs' && options?.method === 'POST').length;
    await createButton.dispatch('click');
    assert.equal(requests.filter(({ path, options }) => path === '/api/jobs' && options?.method === 'POST').length, createSubmissions, 'aria-disabled create cannot duplicate admission');
    createOutcome = 'succeeded';
    await harness.flushTimer();
    await pendingCreate;
    assert.equal(harness.document.activeElement, harness.elements.get('request-panel-heading'));

    harness.elements.get('destroy-confirm').checked = true;
    await harness.elements.get('destroy-confirm').dispatch('change');
    harness.elements.get('destroy-button').focus();
    await harness.elements.get('destroy-button').dispatch('click');
    assert.equal(harness.document.activeElement, harness.elements.get('request-panel-heading'));

    // Re-enter model/create and verify terminal create failure focuses the recovery destination.
    await harness.elements.get('compute-button').dispatch('click');
    harness.elements.get('model-credential').value = 'runtime-only-secret';
    await harness.elements.get('model-button').dispatch('click');
    createOutcome = 'failed';
    await harness.elements.get('create-button').dispatch('click');
    assert.equal(harness.document.activeElement, harness.elements.get('model-panel-heading'));
    assert.equal(harness.elements.get('status').textContent.includes('Reconnect'), true);
    assert.ok(requests.length > 0);
  });
}

test('refresh restoration focuses the authoritative destination heading', async () => {
  const harness = createHarness({
    width: 390,
    fetchImpl: async (path) => {
      assert.equal(path, '/api/session');
      return response(200, {
        csrfToken: 'restored-csrf', connections: { compute: true, model: true }, nedReady: true, job: null,
      });
    },
  });
  await harness.flush();
  assert.equal(harness.document.activeElement, harness.elements.get('request-panel-heading'));
});

test('delayed cancellation conflict reconciles terminal GET and renders ready instead of invalidating the sole poller', async () => {
  const deleteGate = deferred();
  let sessionGets = 0;
  const fetchImpl = async (path, options = {}) => {
    if (path === '/api/session' && !options.method) {
      sessionGets += 1;
      if (sessionGets === 1) return response(401, { error: 'authentication_required' });
      return response(200, {
        csrfToken: 'csrf', connections: { compute: true, model: true }, nedReady: true,
        job: { id: 'race-job', operation: 'create_ned', status: 'succeeded' },
      });
    }
    if (path === '/api/session' && options.method === 'POST') return response(201, { csrfToken: 'csrf' });
    if (path === '/api/compute-connections' || path === '/api/model-connections') return response(201, { status: 'connected' });
    if (path === '/api/jobs') return response(202, { id: 'race-job', operation: 'create_ned', status: 'queued' });
    if (path === '/api/jobs/race-job' && options.method === 'DELETE') {
      await deleteGate.promise;
      return response(409, { error: 'job_not_cancellable' });
    }
    if (path === '/api/jobs/race-job') return response(200, { id: 'race-job', operation: 'create_ned', status: 'succeeded' });
    throw new Error(`unexpected request ${options.method || 'GET'} ${path}`);
  };
  const harness = createHarness({ fetchImpl, controlledTimers: true });
  await harness.flush();
  await harness.elements.get('sign-in-button').dispatch('click');
  await harness.elements.get('compute-button').dispatch('click');
  harness.elements.get('model-credential').value = 'runtime-only-secret';
  await harness.elements.get('model-button').dispatch('click');
  const createPromise = harness.elements.get('create-button').dispatch('click');
  await harness.flush();
  const cancelPromise = harness.elements.get('cancel-button').dispatch('click');
  assert.equal(harness.elements.get('status').textContent.includes('queued'), true, 'the existing poller remains authoritative while DELETE is pending');
  await harness.flushTimer();
  deleteGate.resolve();
  await Promise.all([createPromise, cancelPromise]);
  await harness.flush();

  assert.equal(harness.elements.get('request-panel').hidden, false);
  assert.equal(harness.elements.get('request-button').disabled, false);
  assert.equal(harness.elements.get('cancel-button').hidden, true);
  assert.equal(harness.document.activeElement, harness.elements.get('request-panel-heading'));
  assert.notEqual(harness.elements.get('status').textContent, 'Cancellation could not be confirmed.');
});

test('cancellation failure reconciles an authoritative terminal create failure into recovery UI', async () => {
  const fetchImpl = async (path, options = {}) => {
    if (path === '/api/session' && !options.method) return response(401, { error: 'authentication_required' });
    if (path === '/api/session' && options.method === 'POST') return response(201, { csrfToken: 'csrf' });
    if (path === '/api/compute-connections' || path === '/api/model-connections') return response(201, { status: 'connected' });
    if (path === '/api/jobs') return response(202, { id: 'failed-race-job', operation: 'create_ned', status: 'queued' });
    if (path === '/api/jobs/failed-race-job' && options.method === 'DELETE') {
      return response(503, { error: 'cleanup_pending' });
    }
    if (path === '/api/jobs/failed-race-job') {
      return response(200, { id: 'failed-race-job', operation: 'create_ned', status: 'failed' });
    }
    throw new Error(`unexpected request ${options.method || 'GET'} ${path}`);
  };
  const harness = createHarness({ fetchImpl, controlledTimers: true });
  await harness.flush();
  await harness.elements.get('sign-in-button').dispatch('click');
  await harness.elements.get('compute-button').dispatch('click');
  harness.elements.get('model-credential').value = 'runtime-only-secret';
  await harness.elements.get('model-button').dispatch('click');
  const createPromise = harness.elements.get('create-button').dispatch('click');
  await harness.flush();
  await harness.elements.get('cancel-button').dispatch('click');
  assert.equal(harness.elements.get('model-panel').hidden, false);
  assert.equal(harness.elements.get('status').textContent.includes('failed'), true);
  assert.equal(harness.document.activeElement, harness.elements.get('model-panel-heading'));
  await harness.flushTimer();
  await createPromise;
});

function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
