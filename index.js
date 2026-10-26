const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { Bot } = require('grammy');
const { loadData, saveData } = require('./lib/data-backups');
const { AutonomyEngine } = require('./lib/autonomy-engine');
const { AutonomousSupervisor } = require('./lib/autonomous-supervisor');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Initialize state
const db = loadData();
const supervisor = new AutonomousSupervisor(db);
const autonomyEngine = new AutonomyEngine(db, supervisor);

// Format text according to M2REPS rules
function formatM2REPSPost(productName, discountPercent, link) {
  const nameClean = (productName || 'PRODUIT').trim().toUpperCase();
  const discountClean = discountPercent ? `-${discountPercent}%` : '-15%';
  const linkClean = (link || '').trim();

  return `🛍️ ${nameClean} 🤩‼️\n\n${discountClean} coupon : M2REPS 🎁\n\n👉🏼 ${linkClean}`;
}

// Check duplicate posts
function isDuplicatePost(text, recentPosts = []) {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return recentPosts.some(p => {
    const pNorm = (p.text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return pNorm === normalized;
  });
}

// Setup Express Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: db.version || '6.3.1',
    tasks: db.tasks || [],
    metrics: supervisor.getMetrics(),
    quota: autonomyEngine.getQuotaUsage()
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  const task = autonomyEngine.createTask({ title, description, priority });
  res.json({ success: true, task });
});

let bot = null;
if (BOT_TOKEN) {
  try {
    bot = new Bot(BOT_TOKEN);

    bot.command('start', (ctx) => ctx.reply('M2 HACOO BOT V6.3.1 actif !'));

    bot.command('format', (ctx) => {
      const text = ctx.match;
      if (!text) return ctx.reply('Usage: /format <nom> | <remise> | <lien>');
      const parts = text.split('|');
      const formatted = formatM2REPSPost(parts[0], parts[1], parts[2]);
      ctx.reply(formatted);
    });

    bot.catch((err) => {
      supervisor.recordError('BOT_ERROR', err.message);
    });

    bot.start().catch(err => {
      console.error('Failed to start Telegram bot:', err.message);
    });
  } catch (err) {
    console.error('GrammY initialization error:', err.message);
  }
}

let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`M2 HACOO BOT Dashboard running on port ${PORT}`);
  });
}

module.exports = { app, server, formatM2REPSPost, isDuplicatePost, autonomyEngine, supervisor };
