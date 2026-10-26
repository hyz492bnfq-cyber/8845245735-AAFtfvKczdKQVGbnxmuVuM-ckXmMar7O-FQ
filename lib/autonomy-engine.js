const { saveData } = require('./data-backups');

class AutonomyEngine {
  constructor(db, supervisor) {
    this.db = db;
    this.supervisor = supervisor;
    this.initQuota();
  }

  initQuota() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.db.quota || this.db.quota.date !== today) {
      this.db.quota = {
        date: today,
        usedToday: 0,
        dailyBudget: parseInt(process.env.GEMINI_DAILY_TOKEN_BUDGET || '100000', 10),
        tasksToday: 0,
        maxTasksPerDay: parseInt(process.env.MAX_AUTO_TASKS_PER_DAY || '3', 10)
      };
      saveData(this.db);
    }
  }

  createTask({ title, description, priority = 'MEDIUM', rationale = '' }) {
    this.initQuota();
    const task = {
      id: 'TASK-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title,
      description,
      priority,
      rationale,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: []
    };
    this.db.tasks = this.db.tasks || [];
    this.db.tasks.push(task);
    saveData(this.db);
    return task;
  }

  canExecuteTask() {
    this.initQuota();
    const quota = this.db.quota;
    if (quota.tasksToday >= quota.maxTasksPerDay) {
      return { allowed: false, reason: 'Daily task limit reached' };
    }
    if (quota.usedToday >= quota.dailyBudget) {
      return { allowed: false, reason: 'Daily token budget exceeded - offline mode' };
    }
    return { allowed: true };
  }

  recordTokenUsage(tokens) {
    this.initQuota();
    this.db.quota.usedToday += tokens;
    saveData(this.db);
  }

  getNextPendingTask() {
    return (this.db.tasks || []).find(t => t.status === 'PENDING' || t.status === 'RETRY');
  }

  updateTaskStatus(taskId, status, logMessage = '') {
    const task = (this.db.tasks || []).find(t => t.id === taskId);
    if (!task) return null;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (logMessage) {
      task.logs.push({ timestamp: new Date().toISOString(), message: logMessage });
    }
    if (status === 'IN_PROGRESS') {
      task.attempts += 1;
    }
    if (status === 'COMPLETED') {
      this.db.quota.tasksToday += 1;
    }
    saveData(this.db);
    return task;
  }

  getQuotaUsage() {
    this.initQuota();
    return this.db.quota;
  }
}

module.exports = { AutonomyEngine };
