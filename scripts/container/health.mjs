const checks = [
  ['http://127.0.0.1:9119/api/health', undefined, data => data.ok === true && data.auth_required === true],
  ['http://127.0.0.1:8787/api/health', {Host:new URL(process.env.NED_COM_ORIGIN || 'http://127.0.0.1:8787').host}, data => data.status === 'ok' && data.service === 'nedcom'],
];
try {
  for (const [url,headers,valid] of checks) {
    const response = await fetch(url,{headers,signal:AbortSignal.timeout(3000)});
    if (!response.ok || !valid(await response.json())) throw new Error();
  }
} catch { process.exitCode = 1; }
