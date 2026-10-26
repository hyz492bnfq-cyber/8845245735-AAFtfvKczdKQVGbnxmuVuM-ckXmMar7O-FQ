const { createSnapshot, restoreLatestSnapshot } = require('./data-backups');

class FadeHostDeployer {
  constructor(db) {
    this.db = db;
  }

  canDeploy() {
    // Require explicit human authorization or release candidate check
    if (!this.db.releaseCandidate || this.db.releaseCandidate.status !== 'CANDIDATE') {
      return { allowed: false, reason: 'No valid release candidate ready for deployment' };
    }
    if (!process.env.FADEHOST_HOOK_URL && !process.env.ALLOW_AUTO_DEPLOY) {
      return { allowed: false, reason: 'Human authorization / FadeHost hook missing' };
    }
    return { allowed: true };
  }

  deploy() {
    const check = this.canDeploy();
    if (!check.allowed) {
      throw new Error(`Deployment blocked: ${check.reason}`);
    }

    // Create backup before deploy
    createSnapshot('pre_deploy');

    this.db.deployment = {
      status: 'SUCCESS',
      deployedAt: new Date().toISOString(),
      version: this.db.releaseCandidate.version
    };

    return { success: true, version: this.db.releaseCandidate.version };
  }

  rollback() {
    const restored = restoreLatestSnapshot();
    if (!restored) {
      return { success: false, reason: 'No valid snapshot found to restore' };
    }
    this.db.deployment = {
      status: 'ROLLED_BACK',
      rolledBackAt: new Date().toISOString()
    };
    return { success: true };
  }
}

module.exports = { FadeHostDeployer };
