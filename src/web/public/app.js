const state = {
  csrfToken: null,
  currentStep: 1,
  jobId: null,
  createIdempotencyKey: null,
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

function showStep(step) {
  state.currentStep = step;
  panels.forEach((panel, index) => { panel.hidden = index !== step - 1; });
  steps.forEach((item, index) => {
    item.classList.toggle('active', index === step - 1);
    item.classList.toggle('done', index < step - 1);
  });
  setStatus('');
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.csrfToken) headers['X-CSRF-Token'] = state.csrfToken;
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
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
  state.createIdempotencyKey ||= crypto.randomUUID();
  createButton.disabled = true;
  try {
    setStatus('Submitting an idempotent create job…');
    const job = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ operation: 'create_ned', idempotencyKey: state.createIdempotencyKey }),
    });
    state.jobId = job.id;
    document.getElementById('cancel-button').hidden = false;
    if (job.status === 'succeeded') showStep(5);
    else setStatus(`Create job ${job.status}. You can safely return to this session.`, 'warning');
  } catch {
    createButton.disabled = false;
    setStatus('Provisioning is not enabled in this environment.', 'error');
  }
});

document.getElementById('cancel-button').addEventListener('click', async () => {
  if (!state.jobId) return;
  try {
    await api(`/api/jobs/${encodeURIComponent(state.jobId)}`, { method: 'DELETE', body: '{}' });
    state.jobId = null;
    state.createIdempotencyKey = null;
    document.getElementById('create-button').disabled = false;
    document.getElementById('cancel-button').hidden = true;
    setStatus('Create cancelled. Cleanup compensation was requested.', 'warning');
  } catch { setStatus('Cancellation could not be confirmed.', 'error'); }
});

async function restoreSession() {
  try {
    const session = await api('/api/session');
    state.csrfToken = session.csrfToken;
    state.jobId = session.job?.id || null;
    if (!session.connections.compute) showStep(2);
    else if (!session.connections.model) showStep(3);
    else if (session.job?.status === 'succeeded') showStep(5);
    else {
      showStep(4);
      document.getElementById('create-button').disabled = Boolean(state.jobId);
      document.getElementById('cancel-button').hidden = !state.jobId;
      if (session.job) setStatus(`Create job ${session.job.status}. You can safely continue this session.`, 'warning');
    }
  } catch {
    showStep(1);
  }
}

updateProviderForm();
sessionRestorePromise = restoreSession();
