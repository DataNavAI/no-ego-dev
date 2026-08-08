const PROVIDERS = Object.freeze({
  'openai-codex': Object.freeze({
    id: 'openai-codex', label: 'ChatGPT',
    environmentVariables: Object.freeze([]),
    sandboxEnvironmentVariable: 'NED_OPENAI_CODEX_ACCESS_TOKEN',
    allowedHosts: Object.freeze(['chatgpt.com']),
    hermesProvider: 'openai-codex', defaultModel: 'gpt-5.6-sol',
    delegatedAuthorization: Object.freeze({
      status: 'available', method: 'oauth-device-code',
      note: 'Uses Hermes-compatible ChatGPT device authorization; no API key is requested.',
    }),
  }),
  openai: Object.freeze({
    id: 'openai', label: 'OpenAI',
    environmentVariables: Object.freeze(['OPENAI_API_KEY']),
    sandboxEnvironmentVariable: 'OPENAI_API_KEY',
    allowedHosts: Object.freeze(['api.openai.com']),
    hermesProvider: 'openai-api', defaultModel: 'gpt-5.4',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'Direct OpenAI API access currently requires an API key.',
    }),
  }),
  anthropic: Object.freeze({
    id: 'anthropic', label: 'Anthropic',
    environmentVariables: Object.freeze(['ANTHROPIC_API_KEY']),
    sandboxEnvironmentVariable: 'ANTHROPIC_API_KEY',
    allowedHosts: Object.freeze(['api.anthropic.com']),
    hermesProvider: 'anthropic', defaultModel: 'claude-sonnet-4',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'The browser API connection uses a scoped Anthropic API key fallback.',
    }),
  }),
  gemini: Object.freeze({
    id: 'gemini', label: 'Gemini',
    environmentVariables: Object.freeze(['GEMINI_API_KEY', 'GOOGLE_API_KEY']),
    sandboxEnvironmentVariable: 'GEMINI_API_KEY',
    allowedHosts: Object.freeze(['generativelanguage.googleapis.com']),
    hermesProvider: 'gemini', defaultModel: 'gemini-2.5-pro',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'The Gemini API currently requires an API key for this product path.',
    }),
  }),
  openrouter: Object.freeze({
    id: 'openrouter', label: 'OpenRouter',
    environmentVariables: Object.freeze(['OPENROUTER_API_KEY']),
    sandboxEnvironmentVariable: 'OPENROUTER_API_KEY',
    allowedHosts: Object.freeze(['openrouter.ai']),
    hermesProvider: 'openrouter', defaultModel: 'openai/gpt-5.5',
    delegatedAuthorization: Object.freeze({
      status: 'available', method: 'oauth-pkce',
      note: 'OpenRouter supports the existing OAuth PKCE connection.',
    }),
  }),
});

const PROVIDER_ORDER = Object.freeze(['openai-codex', 'openai', 'anthropic', 'gemini', 'openrouter']);

function providerFor(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unsupported model provider: ${providerId || 'missing'}`);
  return provider;
}

export function listModelProviders() {
  return PROVIDER_ORDER.map((providerId) => {
    const provider = PROVIDERS[providerId];
    return {
      id: provider.id,
      label: provider.label,
      delegatedAuthorization: { ...provider.delegatedAuthorization },
      apiKeyFallback: provider.delegatedAuthorization.status === 'available'
        ? {
            status: 'disabled_when_delegated',
            note: 'Use the supported delegated browser authorization instead of entering an API key.',
          }
        : {
            status: 'available',
            note: 'Accepted only through the secure server-side credential entry path.',
          },
    };
  });
}

export function getModelProviderRuntime(providerId) {
  const provider = providerFor(providerId);
  return {
    id: provider.id,
    label: provider.label,
    sandboxEnvironmentVariable: provider.sandboxEnvironmentVariable,
    allowedHosts: [...provider.allowedHosts],
    hermesProvider: provider.hermesProvider,
    defaultModel: provider.defaultModel,
  };
}

export function selectModelCredential({ providerId, env = {} }) {
  const provider = providerFor(providerId);
  for (const variable of provider.environmentVariables) {
    if (typeof env[variable] === 'string' && env[variable].length > 0) {
      return { providerId, method: 'api-key', value: env[variable] };
    }
  }
  return null;
}

export function createModelConnection({ providerId, method, value }) {
  const provider = providerFor(providerId);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${provider.label} credential is required`);
  }
  if (['oauth-pkce', 'oauth-device-code'].includes(method)
      && provider.delegatedAuthorization.status !== 'available') {
    throw new Error(`${provider.label} delegated authorization is not available for browser API authorization`);
  }
  if (!['api-key', 'oauth-pkce', 'oauth-device-code'].includes(method)) {
    throw new Error(`Unsupported ${provider.label} connection method: ${method || 'missing'}`);
  }

  let credential = value;
  const publicMetadata = Object.freeze({
    providerId,
    method,
    sandboxEnvironmentVariable: provider.sandboxEnvironmentVariable,
    allowedHosts: [...provider.allowedHosts],
    hermesProvider: provider.hermesProvider,
  });

  return Object.freeze({
    ...publicMetadata,
    consumeCredential() {
      if (credential === null) throw new Error(`${provider.label} credential was already consumed`);
      const consumed = credential;
      credential = null;
      return consumed;
    },
    toJSON() { return publicMetadata; },
  });
}
