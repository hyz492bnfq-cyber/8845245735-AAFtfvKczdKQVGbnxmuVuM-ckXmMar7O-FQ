const test = require('node:test');
const assert = require('node:assert/strict');
const { AutonomousAgent } = require('../lib/autonomous-agent');

test('AutonomousAgent blocks edits to sensitive files', () => {
  const agent = new AutonomousAgent({}, {});

  assert.strictEqual(agent.isProtectedFile('.env'), true);
  assert.strictEqual(agent.isProtectedFile('.env.production'), true);
  assert.strictEqual(agent.isProtectedFile('.github/workflows/ci.yml'), true);
  assert.strictEqual(agent.isProtectedFile('config/secrets.json'), true);
  assert.strictEqual(agent.isProtectedFile('index.js'), false);

  assert.throws(
    () => agent.applyPatchInSandbox('.env', 'BOT_TOKEN=hacked'),
    /Security violation/
  );
});
