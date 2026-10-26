const fs = require('fs');
const path = require('path');
const { saveData } = require('./data-backups');

class AutonomousRelease {
  constructor(db) {
    this.db = db;
  }

  bumpPatchVersion(currentVersion) {
    const parts = (currentVersion || '6.3.1').split('.').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
      return '6.3.2';
    }
    parts[2] += 1;
    return parts.join('.');
  }

  prepareReleaseCandidate(changelogSummary = []) {
    const currentVersion = this.db.version || '6.3.1';
    const newVersion = this.bumpPatchVersion(currentVersion);

    const rc = {
      version: newVersion,
      createdAt: new Date().toISOString(),
      changelog: changelogSummary,
      status: 'CANDIDATE'
    };

    this.db.releaseCandidate = rc;
    this.db.history = this.db.history || [];
    this.db.history.push({
      event: 'RELEASE_CANDIDATE_PREPARED',
      version: newVersion,
      timestamp: new Date().toISOString()
    });

    saveData(this.db);
    return rc;
  }

  finalizeRelease() {
    if (!this.db.releaseCandidate) {
      throw new Error('No release candidate available to finalize.');
    }

    const newVersion = this.db.releaseCandidate.version;
    this.db.version = newVersion;

    // Update package.json version
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    }

    this.db.releaseCandidate.status = 'FINALIZED';
    saveData(this.db);
    return newVersion;
  }
}

module.exports = { AutonomousRelease };
