export const modelProviders=Object.freeze(['openai','openrouter','gemini','anthropic','openai-codex','claude-subscription-directsdk-experimental','antigravity-subscription-directsdk']);
export function cleanModelCatalog(value){
  const result={};
  for(const provider of modelProviders){
    const rows=value&&Object.hasOwn(value,provider)&&Array.isArray(value[provider])?value[provider]:[];
    result[provider]=[...new Set(rows.slice(0,100).filter(id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(id)))];
  }
  return result;
}
