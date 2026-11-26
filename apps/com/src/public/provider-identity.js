import {apiFetch} from './api-client.js';

const names = {github: 'GitHub', aws: 'AWS', godaddy: 'GoDaddy'};
const fields = {
  github: [['login', 'GitHub username']],
  aws: [['startUrl', 'AWS access portal URL'], ['region', 'Identity Center region'],
    ['account', 'AWS account ID'], ['role', 'Assigned role name']],
  godaddy: [['domain', 'Managed domain'], ['token', 'GoDaddy personal access token', 'password']],
};

function summary(identity) {
  return identity.login || identity.domain || `${identity.account} · ${identity.role} · ${identity.region}`;
}

export function mountProviderIdentity({document, fetch: request = apiFetch} = {}) {
  const settings = document.getElementById('settings');
  const panel = document.getElementById('provider-connections');
  const list = document.getElementById('provider-list');
  const chatRequests = document.getElementById('chat-provider-requests');
  const announcement = document.getElementById('provider-status');
  if (!panel) return;
  let generation = 0;
  let disabled = false;
  let chatGeneration = 0;
  let chatActionsKey = '[]';
  let authGeneration = 0;
  let modalGeneration = 0;
  let modalTrigger;
  const modal = document.createElement('dialog');
  modal.className = 'provider-auth-modal';
  modal.setAttribute('aria-labelledby','provider-auth-title');
  const title = document.createElement('h2');
  title.id = 'provider-auth-title';
  const modalStatus = document.createElement('p');
  modalStatus.setAttribute('role','status');
  const modalBody = document.createElement('div');
  const close = button('Close',()=>modal.close());
  modal.append(title,modalStatus,modalBody,close);
  document.body.append(modal);
  modal.addEventListener('close',()=>{
    modalGeneration++;
    modalBody.replaceChildren();
    if (modalTrigger?.isConnected) modalTrigger.focus();
    modalTrigger = undefined;
  });
  document.addEventListener('ned-provider-auth-card',event=>{
    void openModal(event.detail.receipt,event.detail.trigger);
  });

  function node(tag, value) {
    const element = document.createElement(tag);
    if (value) element.textContent = value;
    return element;
  }

  async function api(path, method = 'GET', body, id) {
    const response = await request('/api/v1/identity' + path, {
      method, headers: {'X-NED-Identity': '1', ...(id && {'X-NED-Identity-Id': id}), ...(body && {'Content-Type': 'application/json'})},
      ...(body && {body: JSON.stringify(body)}), signal: AbortSignal.timeout(14_000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.error?.code === 'identity_disabled') disabled = true;
      throw new Error(result.error?.message || 'Provider connections are unavailable.');
    }
    return result;
  }

  async function refreshChatRequests() {
    if (!chatRequests || disabled) return;
    const epoch = ++chatGeneration;
    const authEpoch = authGeneration;
    let data;
    try { data = await api(''); }
    catch { /* A disabled or unavailable endpoint provides no actionable request. */ }
    if (epoch !== chatGeneration) return;
    const controls = (data?.connections ?? []).filter(({provider, request, status}) =>
      names[provider] && (request || (data.awsChatShortcut && provider === 'aws' && status !== 'connected')));
    const actionsKey = JSON.stringify(controls.map(({provider, request})=>[provider,request?.id]));
    if (actionsKey === chatActionsKey) return;
    chatActionsKey = actionsKey;
    chatRequests.replaceChildren(...controls.map(connection => {
      const name = names[connection.provider];
      const article = node('article');
      article.className = 'chat-message assistant-message';
      const action = button(`Connect ${name}`, async () => {
        action.disabled = true;
        try {
          if (!connection.request) await api('/aws/request', 'POST');
        } catch { /* Settings can report an unavailable connection. */ }
        finally { action.disabled = false; }
        if (authEpoch !== authGeneration) return;
        document.dispatchEvent(new Event('ned-open-provider-settings'));
        void refresh();
      });
      action.className = 'chat-provider-action';
      article.append(node('strong', 'NED'), node('p', `Connect ${name} to let me use it for your requests.`), action);
      return article;
    }));
    chatRequests.hidden = controls.length === 0;
    document.dispatchEvent(new Event('ned-provider-chat-changed'));
  }

  function button(label, action) {
    const control = node('button', label);
    control.type = 'button';
    control.addEventListener('click', action);
    return control;
  }

  function link(url, label) {
    const control = node('a', label);
    control.href = url;
    control.target = '_blank';
    control.rel = 'noopener noreferrer';
    return control;
  }

  async function openModal(receipt, trigger) {
    if (modal.open) return;
    const epoch = ++modalGeneration;
    modalTrigger = trigger;
    title.textContent = 'Connect ' + names[receipt.provider];
    modalStatus.textContent = 'Checking authorization request…';
    modal.showModal();
    try {
      const {connections} = await api('');
      if (epoch !== modalGeneration || !modal.open) return;
      const connection = connections.find(item => item.provider === receipt.provider);
      if (connection?.request?.id !== receipt.request_id) {
        modalStatus.textContent = 'This request has ended. Ask NED to start a new connection.';
        return;
      }
      modalStatus.textContent = '';
      modalBody.replaceChildren(render(connection,{current:()=>modalGeneration,statusNode:modalStatus,prefix:'modal-provider',done:()=>modal.close()}));
      modalBody.querySelector('input, button')?.focus();
    } catch {
      if (epoch === modalGeneration && modal.open) modalStatus.textContent = 'Authorization is unavailable. Try again.';
    }
  }

  function render(connection, context = {}) {
    const {current = ()=>generation,statusNode=announcement,prefix='provider',done} = context;
    const {provider, status, identity, request: pending} = connection;
    const section = node('section');
    section.className = 'provider-connection';
    section.dataset.provider = provider;
    const heading = node('h4', names[provider]);
    heading.tabIndex = -1;
    section.append(heading, node('p', identity ? `${status === 'expired' ? 'Expired' : 'Connected'} as ${summary(identity)}` : 'Disconnected'));
    const localGeneration = current();
    let busy = false;
    async function action(name, body) {
      if (busy) return;
      busy = true;
      section.setAttribute('aria-busy', 'true');
      const controls = [...section.querySelectorAll('input, button')];
      controls.forEach(control => {control.disabled = true;});
      statusNode.textContent = '';
      try {
        const result = await api(`/${provider}/${name}`, 'POST', body, name === 'disconnect' ? connection.connectionId : pending?.id);
        if (localGeneration !== current()) return;
        if (JSON.stringify(result) === JSON.stringify(connection)) {
          statusNode.textContent = 'Still waiting for provider approval.';
          return;
        }
        if (done && !result.request) {
          done();
          return;
        }
        const replacement = render(result,context);
        section.replaceWith(replacement);
        replacement.querySelector('h4').focus();
        if (name === 'confirm') statusNode.textContent = 'Connection saved.';
        if (name === 'disconnect') statusNode.textContent = 'Disconnected from NED. To revoke the grant, use the provider’s security settings.';
      } catch (error) {
        if (localGeneration !== current()) return;
        try {
          const {connections} = await api('');
          if (localGeneration !== current()) return;
          const connection = connections.find(item => item.provider === provider);
          if (done && connection?.request?.id !== pending?.id) {
            modalBody.replaceChildren();
            statusNode.textContent = 'This request has ended. Ask NED to start a new connection.';
            return;
          }
          const replacement = render(connection,context);
          section.replaceWith(replacement);
          replacement.querySelector('h4').focus();
        } catch { /* Keep the current controls available when readback fails. */ }
        if (localGeneration === current()) statusNode.textContent = error.message;
      } finally {
        busy = false;
        section.removeAttribute('aria-busy');
        controls.forEach(control => {control.disabled = false;});
        void refreshChatRequests();
      }
    }
    if (!pending) {
      section.append(button(identity ? 'Change connection' : 'Connect', () => action('request')));
      if (identity) {
        const confirmation = node('div');
        confirmation.hidden = true;
        const remove = button('Disconnect', () => {confirmation.hidden = false; confirm.focus();});
        const confirm = button('Disconnect from NED', () => action('disconnect'));
        confirmation.append(node('p', `Disconnect ${names[provider]}?`), confirm,
          button('Keep connection', () => {confirmation.hidden = true; remove.focus();}));
        section.append(remove, confirmation);
      }
    } else if (pending.state === 'requested') {
      const form = node('form');
      form.autocomplete = 'off';
      for (const [name, label, type = 'text'] of fields[provider]) {
        const input = node('input');
        input.id = `${prefix}-${provider}-${name}`;
        input.name = name;
        input.type = type;
        input.required = true;
        input.maxLength = type === 'password' ? 8192 : 253;
        if (type === 'password') input.autocomplete = 'new-password';
        const field = node('label', label);
        field.htmlFor = input.id;
        form.append(field, input);
      }
      if (provider === 'godaddy') {
        section.append(link('https://developer.godaddy.com/en/docs/api-users/auth', 'Create a scoped GoDaddy token'));
      }
      const submit = node('button', provider === 'godaddy' ? 'Verify domain access' : 'Get sign-in code');
      submit.type = 'submit';
      form.append(submit);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const password = form.querySelector('input[type=password]');
        if (password) password.value = '';
        void action('start', values);
      });
      section.append(form);
    } else if (pending.state === 'sign_in') {
      section.append(node('p', 'Enter this code only on the provider’s sign-in page. Use the account you want NED to connect.'),
        node('code', pending.code), link(pending.url, `Open ${names[provider]} sign-in`),
        button('Check approval', () => action('poll')));
    } else {
      section.append(node('p', `Verified ${summary(pending.identity)}. Use this identity for NED?`),
        button('Confirm connection', () => action('confirm')));
    }
    if (pending) section.append(button('Cancel connection', () => action('cancel')));
    return section;
  }

  async function refresh() {
    const epoch = ++generation;
    list.replaceChildren();
    panel.hidden = true;
    if (settings.hidden || document.visibilityState === 'hidden' || disabled) return;
    panel.hidden = false;
    announcement.textContent = 'Loading provider connections…';
    try {
      const data = await api('');
      if (epoch !== generation) return;
      list.replaceChildren(...data.connections.map(render));
      announcement.textContent = '';
    } catch {
      if (epoch !== generation) return;
      panel.hidden = disabled;
      announcement.textContent = 'Provider connections are unavailable.';
      if (!disabled) list.append(button('Retry', refresh));
    }
  }

  document.getElementById('provider-refresh').addEventListener('click', refresh);
  new MutationObserver(refresh).observe(settings, {attributes: true, attributeFilter: ['hidden']});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      for (const input of [...list.querySelectorAll('input[type=password]'), ...modalBody.querySelectorAll('input[type=password]')]) input.value = '';
    }
  });
  globalThis.addEventListener?.('ned-chat-settled', refreshChatRequests);
  globalThis.addEventListener?.('pagehide', () => {generation++; chatGeneration++; authGeneration++; list.replaceChildren();});
  document.addEventListener('ned-auth-lost', () => {
    modalGeneration++;
    if (modal.open) modal.close();
    generation++; chatGeneration++; authGeneration++;
    list.replaceChildren(); panel.hidden = true;
    chatActionsKey = '[]';
    chatRequests?.replaceChildren();
    if (chatRequests) chatRequests.hidden = true;
  });
  document.addEventListener('ned-auth-entered', () => {void refreshChatRequests();void refresh();});
}

if (typeof document !== 'undefined') mountProviderIdentity({document});
