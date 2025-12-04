// backend/src/routes/admin.js
import express from 'express';
import QueryLog from '../models/QueryLog.js';
import { templates } from '../templates.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET logs (recent first) - ?limit=50
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const docs = await QueryLog.find().sort({ created_at: -1 }).limit(limit).lean();
    res.json({ items: docs });
  } catch (err) {
    console.error('admin logs error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET templates (reads templates.js exported object)
router.get('/templates', (req, res) => {
  try {
    res.json({ templates });
  } catch (err) {
    console.error('admin templates read error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// PUT templates (optional — writes templates.js file). Use with caution in demo.
// This writes a JSON payload of templates back to templates.js (overwrites).
router.put('/templates', async (req, res) => {
  try {
    const newTemplates = req.body.templates;
    if (!newTemplates || typeof newTemplates !== 'object') {
      return res.status(400).json({ error: 'templates_required' });
    }
    // For safety: write to a separate file 'templates.custom.js' and require that in app if present.
    const outPath = path.resolve('src', 'templates.custom.js');
    const content = `export const templates = ${JSON.stringify(newTemplates, null, 2)};\n`;
    fs.writeFileSync(outPath, content, 'utf8');
    return res.json({ ok: true, path: outPath });
  } catch (err) {
    console.error('admin templates write error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET simple stats: total queries, avg latency (last N)
router.get('/stats', async (req, res) => {
  try {
    const recent = await QueryLog.find().sort({ created_at: -1 }).limit(200).lean();
    const total = await QueryLog.countDocuments();
    const avgLatency = recent.length ? Math.round(recent.reduce((s, r) => s + (r.latency_ms || 0), 0) / recent.length) : 0;
    res.json({ total_queries: total, avg_latency_ms: avgLatency, recent_count: recent.length });
  } catch (err) {
    console.error('admin stats error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
