#!/usr/bin/env node

import { createDevelopmentServer } from '../src/web/dev-server.js';

const port = Number(process.env.PORT || 4173);
const instance = createDevelopmentServer({ port });
await instance.listen();
process.stdout.write(`NED browser development simulation: ${instance.publicOrigin}\n`);
process.stdout.write('No cloud resources or model inference will be created by this process.\n');
