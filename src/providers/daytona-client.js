import { Configuration, SandboxApi, SecretApi } from '@daytona/api-client';
import { Configuration as ToolboxConfiguration, FileSystemApi, ProcessApi } from '@daytona/toolbox-api-client';
import axios from 'axios';

function seconds(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Timeout must be a non-negative number');
  return value * 1000;
}

// Private adapter for existing-workspace operations, not a general Daytona SDK.
// Generated clients retain the pinned provider protocol without image/glob code.
export class DaytonaClient {
  constructor({ apiKey, apiUrl = process.env.DAYTONA_API_URL || process.env.DAYTONA_SERVER_URL || 'https://app.daytona.io/api', pollIntervalMs = 1000 } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Daytona API key is required');
    this.headers = { Authorization: `Bearer ${apiKey}`, 'X-Daytona-Source': 'ned-cli' };
    this.http = axios.create({ timeout: 30_000, maxRedirects: 0 });
    const config = new Configuration({ basePath: apiUrl.replace(/\/$/, ''), baseOptions: { headers: this.headers } });
    this.sandboxApi = new SandboxApi(config, undefined, this.http);
    this.secretApi = new SecretApi(config, undefined, this.http);
    this.pollIntervalMs = pollIntervalMs;
    this.secret = {
      get: async (id) => (await this.secretApi.getSecret(id)).data,
      update: async (id, params) => (await this.secretApi.updateSecret(id, params)).data,
      delete: async (id) => { await this.secretApi.deleteSecret(id); },
      list: async () => (await this.secretApi.listSecretsPaginated()).data,
    };
  }

  async get(id) {
    return this.workspace((await this.sandboxApi.getSandbox(id)).data);
  }

  async *list(query = {}) {
    let cursor;
    const seen = new Set();
    do {
      const { data } = await this.sandboxApi.listSandboxes(undefined, cursor, query.limit, undefined, undefined, query.labels ? JSON.stringify(query.labels) : undefined);
      for (const dto of data.items) yield await this.workspace(dto);
      cursor = data.nextCursor || undefined;
      if (cursor && seen.has(cursor)) throw new Error('Daytona returned a repeated pagination cursor');
      if (cursor) seen.add(cursor);
    } while (cursor);
  }

  async workspace(dto) {
    const id = dto.id;
    // Resolve toolbox lazily: authorization and destruction must still work for
    // stopped/destroyed workspaces where the toolbox may be unavailable.
    let toolbox;
    const toolboxClients = async () => {
      if (!toolbox) {
        toolbox = (async () => {
          const proxy = (await this.sandboxApi.getToolboxProxyUrl(id)).data.url;
          const config = new ToolboxConfiguration({
            basePath: `${proxy.replace(/\/$/, '')}/${encodeURIComponent(id)}`,
            baseOptions: { headers: this.headers },
          });
          return { process: new ProcessApi(config, undefined, this.http), fs: new FileSystemApi(config, undefined, this.http) };
        })();
      }
      return toolbox;
    };
    const workspace = {
      id,
      state: dto.state,
      start: async (timeout = 60) => {
        const duration = seconds(timeout);
        const deadline = duration ? Date.now() + duration : Infinity;
        workspace.state = (await this.sandboxApi.startSandbox(id, undefined, { timeout: duration })).data.state;
        await waitFor('started', deadline);
        toolbox = undefined; // Starting may move the toolbox to another host.
      },
      delete: async (timeout = 60, wait = false) => {
        const duration = seconds(timeout);
        const deadline = duration ? Date.now() + duration : Infinity;
        const { data } = await this.sandboxApi.deleteSandbox(id, undefined, { timeout: duration });
        if (data?.state) workspace.state = data.state;
        if (wait) await waitFor('destroyed', deadline);
      },
      process: {
        executeCommand: async (command, cwd, env, timeout) => {
          const httpTimeout = timeout === undefined ? 30 * 60_000 : seconds(timeout) + 30_000;
          const api = await toolboxClients();
          const { data } = await api.process.executeCommand({ command, cwd, envs: env && Object.keys(env).length ? env : undefined, timeout }, { timeout: httpTimeout });
          const result = data.result ?? '';
          return { exitCode: data.exitCode ?? data.code, result, artifacts: { stdout: result } };
        },
      },
      fs: {
        uploadFile: async (buffer, destination, timeout = 30 * 60) => {
          if (!Buffer.isBuffer(buffer)) throw new Error('NED uploads require a Buffer');
          const duration = seconds(timeout);
          const api = await toolboxClients();
          await api.fs.uploadFile(destination, new Blob([buffer]), { timeout: duration });
        },
        downloadFile: async (path, timeout = 30 * 60) => {
          const duration = seconds(timeout);
          const api = await toolboxClients();
          const { data } = await api.fs.downloadFile(path, { responseType: 'arraybuffer', timeout: duration });
          return Buffer.from(data);
        },
      },
    };
    const waitFor = async (desired, deadline) => {
      while (workspace.state !== desired) {
        if (['error', 'build_failed'].includes(workspace.state)) throw new Error(`Daytona workspace ${id} entered ${workspace.state}`);
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error(`Daytona workspace ${id} timed out waiting for ${desired}`);
        try {
          const { data } = await this.sandboxApi.getSandbox(id, undefined, undefined, { timeout: Number.isFinite(remaining) ? Math.max(1, remaining) : 30_000 });
          workspace.state = data.state;
        } catch (error) {
          if (desired !== 'destroyed' || error.response?.status !== 404) throw error;
          workspace.state = 'destroyed';
        }
        if (workspace.state !== desired) await new Promise((resolve) => setTimeout(resolve, Math.min(this.pollIntervalMs, Math.max(0, deadline - Date.now()))));
      }
    };
    return workspace;
  }
}
