import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';

import { createBrowserServer } from './app.js';

function createEncryptedMemoryVault() {
  const key = randomBytes(32);
  const records = new Map();
  return {
    async put({ ownerId, providerId, method, value }) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const id = `dev_model_${randomUUID().replaceAll('-', '')}`;
      records.set(id, {
        ownerId,
        providerId,
        method,
        iv,
        ciphertext,
        tag: cipher.getAuthTag(),
      });
      return { id };
    },
    async delete({ ownerId, id }) {
      const record = records.get(id);
      if (!record || record.ownerId !== ownerId) throw new Error('Development vault owner mismatch');
      records.delete(id);
      return { id, status: 'deleted' };
    },
  };
}

export function createDevelopmentServer({ env = process.env, port = 4173 } = {}) {
  if (env.NED_WEB_DEV_MODE !== '1') {
    throw new Error('Local browser simulation requires explicit NED_WEB_DEV_MODE=1');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid development port');

  const publicOrigin = `http://127.0.0.1:${port}`;
  const jobs = new Map();
  const server = createBrowserServer({
    publicOrigin,
    authenticate: async () => ({ userId: 'local-development-owner', displayName: 'Local developer' }),
    secretVault: createEncryptedMemoryVault(),
    computeConnector: {
      async connect() { return { id: 'development-compute-simulation', providerId: 'daytona' }; },
    },
    jobService: {
      async create({ operation }) {
        const id = `dev_job_${randomUUID().replaceAll('-', '')}`;
        const job = { id, operation, status: 'queued', polls: 0 };
        jobs.set(id, job);
        return job;
      },
      async get({ jobId }) {
        const job = jobs.get(jobId);
        if (!job) return null;
        job.polls += 1;
        if (job.polls === 1) job.status = 'running';
        if (job.polls >= 2) {
          job.status = 'succeeded';
          if (job.operation === 'send_first_request') job.output = 'Development simulation response.';
        }
        return job;
      },
      async cancel({ jobId }) {
        const job = jobs.get(jobId);
        if (!job) return null;
        job.status = 'cancelled';
        return job;
      },
    },
  });

  return {
    mode: 'development-simulation',
    server,
    publicOrigin,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    }),
    close: () => new Promise((resolve, reject) => {
      if (!server.listening) return resolve();
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}
