const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SENSITIVE_PATTERNS = [
  /\.env.*/i,
  /\.github\/.*/i,
  /keys?\.(json|pem)/i,
  /secrets?/i
];

class AutonomousAgent {
  constructor(autonomyEngine, supervisor) {
    this.engine = autonomyEngine;
    this.supervisor = supervisor;
  }

  isProtectedFile(filepath) {
    const normalized = path.normalize(filepath);
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(normalized));
  }

  applyPatchInSandbox(filepath, patchContent) {
    if (this.isProtectedFile(filepath)) {
      throw new Error(`Security violation: Editing protected file '${filepath}' is strictly forbidden.`);
    }

    const fullPath = path.resolve(filepath);
    const backupPath = `${fullPath}.bak`;

    if (fs.existsSync(fullPath)) {
      fs.copyFileSync(fullPath, backupPath);
    }

    try {
      fs.writeFileSync(fullPath, patchContent, 'utf8');

      // Syntax checking for JS files
      if (filepath.endsWith('.js')) {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
      }

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      return { success: true };
    } catch (err) {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, fullPath);
        fs.unlinkSync(backupPath);
      }
      return { success: false, error: err.message };
    }
  }

  runSelfRepairLoop(task, patchFn) {
    let attempt = 0;
    const maxAttempts = task.maxAttempts || 3;

    while (attempt < maxAttempts) {
      attempt++;
      this.engine.updateTaskStatus(task.id, 'IN_PROGRESS', `Attempt ${attempt}/${maxAttempts}`);

      try {
        const patchResult = patchFn(attempt);
        if (!patchResult.success) {
          this.engine.updateTaskStatus(task.id, 'RETRY', `Patch failed on attempt ${attempt}: ${patchResult.error}`);
          continue;
        }

        // Run tests
        execSync('npm test', { stdio: 'pipe' });
        this.engine.updateTaskStatus(task.id, 'COMPLETED', `Successfully applied and verified patch on attempt ${attempt}`);
        return { success: true, attempts: attempt };
      } catch (err) {
        this.engine.updateTaskStatus(task.id, 'RETRY', `Tests failed on attempt ${attempt}: ${err.message}`);
      }
    }

    this.engine.updateTaskStatus(task.id, 'FAILED', `Exhausted ${maxAttempts} attempts without resolution.`);
    return { success: false, attempts: attempt };
  }
}

module.exports = { AutonomousAgent };
