import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

const runNode = (script, args = []) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
};

runNode('scripts/validate-build-env.mjs');
runNode('node_modules/vite/bin/vite.js', ['build']);
runNode('node_modules/@capacitor/cli/bin/capacitor', ['sync', 'android']);
