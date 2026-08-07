const state = {
  csrfToken: null,
  currentStep: 1,
  jobId: null,
  createIdempotencyKey: null,
  createPending: false,
  requestIdempotencyKey: null,
  resumeIdempotencyKey: null,
  destroyIdempotencyKey: null,
  pollGeneration: 0,
};

const status = document.getElementById('status');
const panels = [
  document.getElementById('sign-in-panel'),
  document.getElementById('compute-panel'),
  document.getElementById('model-panel'),
  document.getElementById('create-panel'),
  document.getElementById('request-panel'),
];
const steps = [...document.querySelectorAll('.steps li')];
let sessionRestorePromise;

function setStatus(message, tone = 'normal') {
  status.textContent = message;
  status.classList.toggle('error', tone === 'error');
  status.classList.toggle('warning', tone === 'warning');
}

function showStep(step, { focus = true } = {}) {
  state.currentStep = step;
  panels.forEach((panel, index) => { panel.hidden = index !== step - 1; });
  steps.forEach((item, index) => {
    item.classList.toggle('active', index === step - 1);
    item.classList.toggle('done', index < step - 1);
  });
  setStatus('');
  if (focus) panels[step - 1]?.querySelector('h2')?.focus();
}

async function api(path, options = {}) {
  if (!/^\/api\/[A-Za-z0-9_/-]+$/.test(path)) throw new Error('invalid_api_path');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.csrfToken) headers['X-CSRF-Token'] = state.csrfToken;
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForJob(initialJob) {
  let job = initialJob;
  const generation = ++state.pollGeneration;
  while (['queued', 'running'].includes(job.status)) {
    setStatus(`${job.operation.replaceAll('_', ' ')} ${job.status}. You can safely return to this session.`, 'warning');
    await wait(250);
    if (generation !== state.pollGeneration) return null;
    job = await api(`/api/jobs/${encodeURIComponent(job.id)}`);
  }
  return job;
}

function renderCompletedJob(job) {
  if (!job) return;
  if (job.operation === 'create_ned') {
    const createButton = document.getElementById('create-button');
    state.createPending = false;
    createButton.setAttribute('aria-disabled', 'false');
    document.getElementById('cancel-button').hidden = true;
    if (job.status === 'succeeded') {
      showStep(5);
      setStatus('NED is ready.');
      createButton.disabled = true;
      document.getElementById('request-button').disabled = false;
      document.getElementById('resume-button').disabled = false;
      document.getElementById('destroy-button').disabled = !document.getElementById('destroy-confirm').checked;
    } else {
      document.getElementById('create-button').disabled = false;
      state.createIdempotencyKey = null;
      showStep(3);
      setStatus(`Create job ${job.status}. Reconnect the model provider before retrying.`, 'error');
    }
  } else if (job.operation === 'send_first_request') {
    const requestButton = document.getElementById('request-button');
    if (job.status === 'succeeded') {
      const output = document.getElementById('first-response');
      output.textContent = job.output;
      output.hidden = false;
      document.getElementById('first-message').value = '';
      state.requestIdempotencyKey = null;
      requestButton.disabled = false;
      setStatus('First request completed.');
    } else {
      requestButton.disabled = false;
      state.requestIdempotencyKey = null;
      setStatus(`First request ${job.status}.`, 'error');
    }
  } else if (job.operation === 'resume_ned') {
    document.getElementById('resume-button').disabled = false;
    state.resumeIdempotencyKey = null;
    setStatus(job.status === 'succeeded' ? 'NED resumed.' : `Resume ${job.status}.`, job.status === 'succeeded' ? 'normal' : 'error');
  } else if (job.operation === 'destroy_ned') {
    if (job.status === 'succeeded') {
      document.getElementById('request-button').disabled = true;
      document.getElementById('resume-button').disabled = true;
      document.getElementById('destroy-button').disabled = true;
      document.getElementById('destroy-confirm').disabled = true;
      setStatus('NED destroyed and owned credentials revoked.');
      panels[4].querySelector('h2')?.focus();
    } else {
      document.getElementById('destroy-button').disabled = false;
      state.destroyIdempotencyKey = null;
      setStatus(`Destroy ${job.status}.`, 'error');
    }
  }
}

document.getElementById('sign-in-button').addEventListener('click', async () => {
  try {
    await sessionRestorePromise;
    setStatus('Starting a secure session…');
    const session = await api('/api/session', { method: 'POST', body: '{}' });
    state.csrfToken = session.csrfToken;
    showStep(2);
  } catch { setStatus('Sign-in is not configured for this environment.', 'error'); }
});

document.getElementById('compute-button').addEventListener('click', async () => {
  try {
    setStatus('Connecting isolated compute…');
    await api('/api/compute-connections', {
      method: 'POST', body: JSON.stringify({ providerId: 'daytona' }),
    });
    showStep(3);
  } catch { setStatus('Compute authorization is not available.', 'error'); }
});

function selectedProvider() {
  return document.querySelector('input[name="provider"]:checked').value;
}

function updateProviderForm() {
  const delegated = selectedProvider() === 'openrouter';
  document.getElementById('credential-fields').hidden = delegated;
  document.getElementById('delegated-note').hidden = !delegated;
  document.getElementById('model-button').disabled = delegated;
}

document.querySelectorAll('input[name="provider"]').forEach((input) => {
  input.addEventListener('change', updateProviderForm);
});

document.getElementById('model-button').addEventListener('click', async () => {
  const credentialInput = document.getElementById('model-credential');
  try {
    setStatus('Transferring credential to the server vault…');
    await api('/api/model-connections', {
      method: 'POST',
      body: JSON.stringify({
        providerId: selectedProvider(), method: 'api-key', credential: credentialInput.value,
      }),
    });
    credentialInput.value = '';
    showStep(4);
  } catch {
    credentialInput.value = '';
    setStatus('Model-provider connection failed. Verify the credential and try again.', 'error');
  }
});

document.getElementById('create-button').addEventListener('click', async () => {
  const createButton = document.getElementById('create-button');
  if (state.createPending) return;
  state.createPending = true;
  createButton.setAttribute('aria-disabled', 'true');
  state.createIdempotencyKey ||= crypto.randomUUID();
  try {
    setStatus('Submitting an idempotent create job…');
    const job = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ operation: 'create_ned', idempotencyKey: state.createIdempotencyKey }),
    });
    state.jobId = job.id;
    document.getElementById('cancel-button').hidden = false;
    renderCompletedJob(await waitForJob(job));
  } catch {
    state.createPending = false;
    createButton.setAttribute('aria-disabled', 'false');
    createButton.disabled = false;
    setStatus('Provisioning is not enabled in this environment.', 'error');
  }
});

async function reconcileAfterCancellationFailure(jobId) {
  try {
    const authoritative = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (['queued', 'running'].includes(authoritative.status)) {
      renderCompletedJob(await waitForJob(authoritative));
    } else {
      renderCompletedJob(authoritative);
    }
    return;
  } catch {
    await restoreSession();
  }
}

document.getElementById('cancel-button').addEventListener('click', async () => {
  if (!state.jobId) return;
  const jobId = state.jobId;
  try {
    const cancelled = await api(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', body: '{}' });
    state.pollGeneration += 1;
    state.jobId = null;
    state.createIdempotencyKey = null;
    state.createPending = false;
    document.getElementById('create-button').setAttribute('aria-disabled', 'false');
    document.getElementById('create-button').disabled = false;
    document.getElementById('cancel-button').hidden = true;
    showStep(3);
    setStatus(`Create ${cancelled.status}. Cleanup was verified; reconnect the model provider to retry.`, 'warning');
  } catch {
    setStatus('Reconciling authoritative provisioning state…', 'warning');
    await reconcileAfterCancellationFailure(jobId);
  }
});

document.getElementById('request-button').addEventListener('click', async () => {
  const requestButton = document.getElementById('request-button');
  const message = document.getElementById('first-message');
  state.requestIdempotencyKey ||= crypto.randomUUID();
  requestButton.disabled = true;
  try {
    setStatus('Sending your first typed request…');
    const job = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'send_first_request', prompt: message.value,
        idempotencyKey: state.requestIdempotencyKey,
      }),
    });
    state.jobId = job.id;
    renderCompletedJob(await waitForJob(job));
  } catch {
    requestButton.disabled = false;
    setStatus('The first request could not be completed.', 'error');
  }
});

document.getElementById('resume-button').addEventListener('click', async () => {
  const button = document.getElementById('resume-button');
  state.resumeIdempotencyKey ||= crypto.randomUUID();
  button.disabled = true;
  try {
    const job = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ operation: 'resume_ned', idempotencyKey: state.resumeIdempotencyKey }),
    });
    state.jobId = job.id;
    renderCompletedJob(await waitForJob(job));
  } catch {
    button.disabled = false;
    state.resumeIdempotencyKey = null;
    setStatus('NED could not be resumed.', 'error');
  }
});

document.getElementById('destroy-confirm').addEventListener('change', (event) => {
  document.getElementById('destroy-button').disabled = !event.target.checked;
});

document.getElementById('destroy-button').addEventListener('click', async () => {
  const button = document.getElementById('destroy-button');
  state.destroyIdempotencyKey ||= crypto.randomUUID();
  button.disabled = true;
  try {
    const job = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ operation: 'destroy_ned', idempotencyKey: state.destroyIdempotencyKey }),
    });
    state.jobId = job.id;
    renderCompletedJob(await waitForJob(job));
  } catch {
    button.disabled = false;
    state.destroyIdempotencyKey = null;
    setStatus('NED could not be destroyed.', 'error');
  }
});

async function restoreSession() {
  try {
    const session = await api('/api/session');
    state.csrfToken = session.csrfToken;
    state.jobId = session.job?.id || null;
    if (!session.connections.compute) showStep(2);
    else if (!session.connections.model) showStep(3);
    else if (session.nedReady) {
      showStep(5);
      document.getElementById('request-button').disabled = false;
      document.getElementById('resume-button').disabled = false;
      document.getElementById('destroy-button').disabled = !document.getElementById('destroy-confirm').checked;
    } else {
      showStep(4);
      document.getElementById('create-button').disabled = Boolean(state.jobId);
      document.getElementById('cancel-button').hidden = session.job?.operation !== 'create_ned'
        || !['queued', 'running'].includes(session.job.status);
    }
    if (session.job) {
      const job = ['queued', 'running'].includes(session.job.status)
        ? await waitForJob(session.job)
        : session.job;
      renderCompletedJob(job);
    }
  } catch {
    showStep(1);
  }
}

updateProviderForm();
sessionRestorePromise = restoreSession();
