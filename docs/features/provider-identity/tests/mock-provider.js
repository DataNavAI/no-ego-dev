import http from 'node:http';

export async function mockProvider(t) {
  const token = 'synthetic-domain-read-grant';
  const domain = 'example.test';
  const protectedRoute = '/v3/domains/domain-names/' + domain;
  const providerRoute = 'https://api.godaddy.com' + protectedRoute;
  const reads = [];
  let approved = false;
  const server = http.createServer((req, res) => {
    if (req.url === '/authorize' && ['GET', 'POST'].includes(req.method)) {
      if (req.method === 'POST') approved = true;
      res.writeHead(200, {'content-type': 'text/html', 'cache-control': 'no-store'});
      res.end(approved
        ? `<h1>Domain access approved</h1><output aria-label="Access token">${token}</output>`
        : '<h1>Mock provider</h1><form method="post"><button>Allow domain read</button></form>');
      return;
    }
    if (req.method === 'GET' && req.url === protectedRoute) {
      const allowed = approved && req.headers.authorization === 'Bearer ' + token;
      reads.push(allowed ? 200 : 401);
      res.writeHead(allowed ? 200 : 401, {'content-type': 'application/json'});
      res.end(JSON.stringify(allowed ? {domain} : {error: 'authorization_required'}));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return {
    token, domain, reads, authorizationUrl: origin + '/authorize', resourceUrl: origin + protectedRoute,
    fetch(url, options) {
      if (url !== providerRoute) throw new Error('Unexpected provider request');
      return fetch(origin + protectedRoute, options);
    },
  };
}
