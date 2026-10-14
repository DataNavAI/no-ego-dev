const PROVIDERS = Object.freeze({
  'openai-codex': Object.freeze({
    id: 'openai-codex', label: 'ChatGPT',
    delegatedAuthorization: Object.freeze({
      status: 'available', method: 'oauth-device-code',
      note: 'Uses Hermes-compatible ChatGPT device authorization; no API key is requested.',
    }),
  }),
  openai: Object.freeze({
    id: 'openai', label: 'OpenAI',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'Direct OpenAI API access currently requires an API key.',
    }),
  }),
  anthropic: Object.freeze({
    id: 'anthropic', label: 'Anthropic',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'The browser API connection uses a scoped Anthropic API key fallback.',
    }),
  }),
  gemini: Object.freeze({
    id: 'gemini', label: 'Gemini',
    delegatedAuthorization: Object.freeze({
      status: 'unavailable_for_api', method: null,
      note: 'The Gemini API currently requires an API key for this product path.',
    }),
  }),
  openrouter: Object.freeze({
    id: 'openrouter', label: 'OpenRouter',
    delegatedAuthorization: Object.freeze({
      status: 'available', method: 'oauth-pkce',
      note: 'OpenRouter supports the existing OAuth PKCE connection.',
    }),
  }),
});

const PROVIDER_ORDER = Object.freeze(['openai-codex', 'openai', 'anthropic', 'gemini', 'openrouter']);

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
