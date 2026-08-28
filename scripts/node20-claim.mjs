import { spawnSync } from 'node:child_process';

const tag = '@claim:node20-runtime';
const major = Number(process.versions.node.split('.')[0]);
if (major !== 20) throw new Error(`${tag} expected Node 20, received ${process.version}`);

for (const args of [['test'], ['run', 'build']]) {
  const result = spawnSync('npm', args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`PASS ${tag} on ${process.version}`);
