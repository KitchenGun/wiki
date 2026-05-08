import { spawnSync } from 'node:child_process';

function run(command) {
  const result = spawnSync(command, {
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('graphify update .');
run('node scripts/graphify-codex-semantics.mjs');
run('graphify cluster-only .');
