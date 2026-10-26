const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data.json');
const BACKUPS_DIR = path.join(process.cwd(), '.backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      version: '6.3.1',
      tasks: [],
      metrics: { errors: [], runs: 0 },
      quota: { usedToday: 0, dailyBudget: 100000, date: new Date().toISOString().split('T')[0] },
      history: []
    };
    saveData(initial);
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { version: '6.3.1', tasks: [], metrics: { errors: [] }, quota: {}, history: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function createSnapshot(label = 'auto') {
  ensureBackupsDir();
  if (!fs.existsSync(DATA_FILE)) return null;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUPS_DIR, `data_snapshot_${label}_${timestamp}.json`);
  fs.copyFileSync(DATA_FILE, backupPath);
  return backupPath;
}

function restoreLatestSnapshot() {
  ensureBackupsDir();
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('data_snapshot_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return false;
  const latest = path.join(BACKUPS_DIR, files[0]);
  fs.copyFileSync(latest, DATA_FILE);
  return true;
}

module.exports = {
  loadData,
  saveData,
  createSnapshot,
  restoreLatestSnapshot
};
