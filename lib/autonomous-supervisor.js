const { saveData } = require('./data-backups');

class AutonomousSupervisor {
  constructor(db) {
    this.db = db;
    this.db.metrics = this.db.metrics || { errors: [], startTime: Date.now() };
  }

  recordError(type, message, context = {}) {
    const errorEntry = {
      id: 'ERR-' + Date.now(),
      type,
      message,
      context,
      timestamp: new Date().toISOString()
    };

    this.db.metrics.errors = this.db.metrics.errors || [];
    this.db.metrics.errors.push(errorEntry);

    // Keep last 100 errors
    if (this.db.metrics.errors.length > 100) {
      this.db.metrics.errors.shift();
    }

    saveData(this.db);
    return errorEntry;
  }

  detectRecurringErrors(threshold = 3) {
    const counts = {};
    (this.db.metrics.errors || []).forEach(err => {
      counts[err.type] = (counts[err.type] || 0) + 1;
    });

    const recurring = [];
    for (const [type, count] of Object.entries(counts)) {
      if (count >= threshold) {
        recurring.push({ type, count });
      }
    }
    return recurring;
  }

  getMetrics() {
    return {
      totalErrors: (this.db.metrics.errors || []).length,
      recurringErrors: this.detectRecurringErrors(),
      uptimeSeconds: Math.floor((Date.now() - (this.db.metrics.startTime || Date.now())) / 1000)
    };
  }
}

module.exports = { AutonomousSupervisor };
