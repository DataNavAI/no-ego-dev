#!/usr/bin/env node
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createStagingController,runInstalled} from '../src/staging/controller.js';

// Setup takes an explicit non-secret JSON configuration; no ambient profile,
// credential-store or global installer defaults are inferred.
try {
 const args=process.argv.slice(2);
 if(args[0]==='setup'&&args[1]==='--settings'&&args[2]&&args.length===3){
  const options=JSON.parse(await fs.readFile(path.resolve(args[2]),'utf8'));
  console.log(JSON.stringify(await createStagingController(options).setup(),null,2));
 }else if(args[0]==='--root'&&args[1])await runInstalled(path.resolve(args[1]),'control',args.slice(2));
 else {console.error('Usage: node bin/ned-staging.js setup --settings <stage-only-settings.json> | --root <stage-root> status|update|rollback|remove|recover-work');process.exitCode=2;}
}catch{console.error('Staging setup failed. Use an independent owned root, verified runtimes and complete main CI settings. No model access was enabled.');process.exitCode=1;}
