const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { AutonomyEngine } = require('../lib/autonomy-engine');
const { AutonomousAgent } = require('../lib/autonomous-agent');
const { AutonomousSupervisor } = require('../lib/autonomous-supervisor');
const { AutonomousRelease } = require('../lib/autonomous-release');

test('AutonomyEngine manages tasks and token budgets', () => {
  const db = { tasks: [], quota: { usedToday: 0, dailyBudget: 100, tasksToday: 0, maxTasksPerDay: 2, date: new Date().toISOString().split('T')[0] } };
  const supervisor = new AutonomousSupervisor(db);
  const engine = new AutonomyEngine(db, supervisor);

  const task = engine.createTask({ title: 'Test Task', description: 'Testing task creation' });
  assert.strictEqual(task.status, 'PENDING');
  assert.strictEqual(db.tasks.length, 1);

  const canExec1 = engine.canExecuteTask();
  assert.strictEqual(canExec1.allowed, true);

  engine.recordTokenUsage(150);
  const canExec2 = engine.canExecuteTask();
  assert.strictEqual(canExec2.allowed, false);
  assert.match(canExec2.reason, /budget/i);
});

test('AutonomousAgent applies patches and self-repairs failed patches', () => {
  const db = { tasks: [], quota: { usedToday: 0, dailyBudget: 10000, tasksToday: 0, maxTasksPerDay: 10, date: new Date().toISOString().split('T')[0] } };
  const supervisor = new AutonomousSupervisor(db);
  const engine = new AutonomyEngine(db, supervisor);
  const agent = new AutonomousAgent(engine, supervisor);

  const task = engine.createTask({ title: 'Fix bug', description: 'Patching code' });

  const dummyFilePath = path.join(__dirname, 'dummy.js');
  fs.writeFileSync(dummyFilePath, 'module.exports = 1;', 'utf8');

  try {
    const res = agent.runSelfRepairLoop(task, (attempt) => {
      if (attempt === 1) {
        // Invalid JS
        return agent.applyPatchInSandbox(dummyFilePath, 'const x = ;');
      }
      // Valid JS
      return agent.applyPatchInSandbox(dummyFilePath, 'module.exports = 2;');
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.attempts, 2);
  } finally {
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
  }
});

test('AutonomousRelease manages semver and release candidates', () => {
  const db = { version: '6.3.1', tasks: [], history: [] };
  const release = new AutonomousRelease(db);

  const rc = release.prepareReleaseCandidate(['Added autonomous engine tests']);
  assert.strictEqual(rc.version, '6.3.2');
  assert.strictEqual(rc.status, 'CANDIDATE');

  const finalVer = release.finalizeRelease();
  assert.strictEqual(finalVer, '6.3.2');
  assert.strictEqual(db.version, '6.3.2');
});
