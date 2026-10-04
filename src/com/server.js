import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { realpath, stat, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname, basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { artifactFile, listArtifacts, failure } from './artifacts.js';
import { quickTunnel } from './tunnel.js';
import { saveReceipt } from './state.js';

export async function startCom({ root, local = false, port = 0, state, maxFileBytes = 100 * 1024 * 1024, maxScanEntries = 10000, cloudflared = 'cloudflared', tunnelTimeoutMs = 20000, signal }) {
  if (!root) throw new Error('Explicit --root review directory is required');
  const approvedRoot = resolve(root);
  root = await realpath(approvedRoot);
  if (!(await stat(root)).isDirectory()) throw new Error('Root must be a directory');
  const excluded = new Set();
  if (state) {
    state=resolve(state);await mkdir(dirname(state),{recursive:true,mode:0o700});
    excluded.add(relative(root,resolve(await realpath(dirname(state)),basename(state))));
  }
  const capability = randomBytes(32).toString('hex');
  const prefix = `/s/${capability}/`;
  const server = createServer(async (req, res) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith(prefix)) throw failure(404,'Not found');
      if (!['GET','HEAD'].includes(req.method)) throw failure(405,'Read-only service');
      if (url.pathname === prefix + 'api/health') {
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ instanceId: receipt.instanceId })); return;
      }
      if (url.pathname === prefix + 'api/artifacts') {
        const artifacts = await listArtifacts(root,{ maxFileBytes,maxScanEntries,excluded });
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ artifacts, limits: { maxFileBytes,maxScanEntries } })); return;
      }
      if (url.pathname === prefix + 'api/artifact') {
        const { handle, info, type } = await artifactFile(root,url.searchParams.get('path'),maxFileBytes,excluded);
        try {
          let start = 0, end = info.size-1, status = 200;
          res.setHeader('Accept-Ranges','bytes');
          if (req.headers.range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
            if (!match || (!match[1] && !match[2])) throw failure(416,'Invalid range');
            start = match[1] ? Number(match[1]) : Math.max(0,info.size-Number(match[2]));
            end = match[1] && match[2] ? Math.min(Number(match[2]),end) : end;
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) throw failure(416,'Unsatisfiable range');
            status = 206; res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
          }
          // Native PDF previews are same-origin frames; only PDFs may be framed.
          // Keep the shell and all other artifacts protected against embedding.
          if (type[0] === 'pdf') res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
          res.setHeader('Content-Type',type[1]); res.setHeader('Content-Length',Math.max(0,end-start+1)); res.writeHead(status);
          if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
          await pipeline(handle.createReadStream({start,end,autoClose:false}),res);
        } finally { await handle.close(); }
        return;
      }
      const assets = {
        '': [new URL('./public/index.html',import.meta.url),'text/html; charset=utf-8'],
        'app.js': [new URL('./public/app.js',import.meta.url),'text/javascript'],
        'styles.css': [new URL('./public/styles.css',import.meta.url),'text/css'],
        'markdown.js': [new URL('./markdown.js',import.meta.url),'text/javascript'],
        'vendor/marked.js': [new URL('../../node_modules/marked/lib/marked.esm.js',import.meta.url),'text/javascript'],
        'vendor/purify.js': [new URL('../../node_modules/dompurify/dist/purify.es.mjs',import.meta.url),'text/javascript'],
      };
      const asset = assets[url.pathname.slice(prefix.length)];
      if (asset) {
        const { readFile } = await import('node:fs/promises');
        res.setHeader('Content-Type',asset[1]);
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; frame-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        res.end(req.method === 'HEAD' ? undefined : await readFile(asset[0])); return;
      }
      throw failure(404,'Not found');
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(error.status || (['ENOENT','ENOTDIR','ELOOP'].includes(error.code) ? 404 : 500),{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:error.status ? error.message : 'Artifact unavailable'}));
    }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', () => { server.off('error',no); yes(); }); });
  const receipt = { schemaVersion: 1, status: 'starting', root, approvedRoot, capability, instanceId: randomBytes(16).toString('hex'), localOrigin: `http://127.0.0.1:${server.address().port}`, publicOrigin: null, pid: process.pid, startedAt: new Date().toISOString(), maxFileBytes, maxScanEntries };
  let tunnel, closing, resolveClosed;
  const closed = new Promise(resolve => { resolveClosed=resolve; });
  const close = () => closing ||= (async () => {
    signal?.removeEventListener('abort',onAbort);
    await tunnel?.close();
    await new Promise(yes => { server.close(yes); server.closeAllConnections(); });
    const wasRunning = receipt.status === 'running'; receipt.status='stopped';receipt.stoppedAt=new Date().toISOString();
    if (state && wasRunning) await saveReceipt(state,receipt);
    resolveClosed();
  })();
  const onAbort=()=>{void close();};
  try {
    if (signal?.aborted) throw new Error('COM startup cancelled');
    if (!local) {
      tunnel=await quickTunnel(receipt.localOrigin,{binary:cloudflared,timeoutMs:tunnelTimeoutMs,signal});
      receipt.publicOrigin=tunnel.publicOrigin;receipt.tunnelPid=tunnel.child.pid;
      tunnel.child.once('exit',()=>{void close();});
      if (tunnel.child.exitCode!==null || tunnel.child.signalCode!==null) throw new Error('Cloudflared tunnel exited during startup');
    }
    if (signal?.aborted) throw new Error('COM startup cancelled');
    receipt.status='running';
    if (state) await saveReceipt(state,receipt);
    signal?.addEventListener('abort',onAbort,{once:true});
    if (signal?.aborted) await close();
    return { receipt, url: (receipt.publicOrigin || receipt.localOrigin)+prefix, localUrl: receipt.localOrigin+prefix, close, closed };
  } catch (error) { await close(); throw error; }
}
