import { test } from 'node:test';
import path from 'node:path';
import { fixture, assert, writeFile, rm, readFile } from './helpers.js';
test('TC-002: reject failed checks and preserve partial or mutated candidates', async (t) => {
  for (const variant of ['lint', 'signal', 'test:all', 'python', 'missing-python', 'missing-node', 'missing-npm', 'unstaged', 'untracked', 'worktree-drift', 'index-drift']) {
    await t.test(variant, async (t) => {
      const f = await fixture(t), before = f.head();
      assert.equal(f.install().status, 0);
      const staged = f.run(['diff', '--cached']).stdout;
      const env = {};
      if (['lint', 'signal', 'test:all', 'python'].includes(variant)) env.HOOK_FAIL = variant;
      for (const command of ['npm', 'python', 'node'])
        if (variant === `missing-${command}`) await rm(path.join(f.dir, `bin/${command}`));
      if (variant === 'unstaged') await writeFile(path.join(f.dir, 'README.md'), 'partial user edit\n');
      if (variant === 'untracked') await writeFile(path.join(f.dir, 'new-file'), 'user data\n');
      if (variant.endsWith('-drift')) env.HOOK_MUTATE = variant.startsWith('index') ? 'index' : 'worktree';
      const result = f.commit(env);
      assert.notEqual(result.status, 0, variant);
      assert.equal(f.head(), before);
      assert.deepEqual(await f.calls(), ['lint', 'signal'].includes(variant) ? ['lint'] : ['test:all', 'worktree-drift', 'index-drift'].includes(variant) ? ['lint', 'test:all'] : []);
      if (variant !== 'index-drift') assert.equal(f.run(['diff', '--cached']).stdout, staged);
      if (variant === 'unstaged') assert.equal(await readFile(path.join(f.dir, 'README.md'), 'utf8'), 'partial user edit\n');
      if (variant === 'untracked') assert.equal(await readFile(path.join(f.dir, 'new-file'), 'utf8'), 'user data\n');
      if (variant.endsWith('-drift')) assert.equal(await readFile(path.join(f.dir, 'README.md'), 'utf8'), 'check mutation\n');
    });
  }
});
