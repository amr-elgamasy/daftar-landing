/**
 * Landing Page Server
 * Standalone Express server that serves the landing page
 * Configuration is managed from the admin dashboard via API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'config.default.json');
const API_SECRET = process.env.LANDING_API_SECRET || 'daftar-landing-secret-key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth middleware for admin API endpoints ───
function verifyApiSecret(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token || token !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// ─── Config helpers ───
function getConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// ═══════════════════════════════════════════
//  Public API (used by the landing page JS)
// ═══════════════════════════════════════════
app.get('/api/config', (req, res) => {
  const config = getConfig();
  if (!config) {
    return res.status(500).json({ success: false, message: 'Config not found' });
  }
  res.json({ success: true, data: config });
});

// ═══════════════════════════════════════════
//  Admin API (called from admin dashboard)
// ═══════════════════════════════════════════

// GET full config (admin)
app.get('/api/admin/config', verifyApiSecret, (req, res) => {
  const config = getConfig();
  res.json({ success: true, data: config });
});

// PUT full config
app.put('/api/admin/config', verifyApiSecret, (req, res) => {
  try {
    const config = req.body.config || req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }
    saveConfig(config);
    res.json({ success: true, message: 'تم حفظ إعدادات الصفحة بنجاح' });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ success: false, message: 'فشل في حفظ الإعدادات' });
  }
});

// PUT section
app.put('/api/admin/config/section/:section', verifyApiSecret, (req, res) => {
  try {
    const { section } = req.params;
    const sectionData = req.body.data !== undefined ? req.body.data : req.body;
    const config = getConfig();
    if (!config) {
      return res.status(404).json({ success: false, message: 'ملف الإعدادات غير موجود' });
    }
    config[section] = sectionData;
    saveConfig(config);
    res.json({ success: true, message: `تم حفظ قسم "${section}" بنجاح` });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ success: false, message: 'فشل في حفظ القسم' });
  }
});

// PUT publish toggle
app.put('/api/admin/publish', verifyApiSecret, (req, res) => {
  try {
    const { is_published } = req.body;
    const config = getConfig();
    if (!config) {
      return res.status(404).json({ success: false, message: 'ملف الإعدادات غير موجود' });
    }
    config.is_published = !!is_published;
    saveConfig(config);
    res.json({ success: true, message: is_published ? 'تم نشر الصفحة' : 'تم إلغاء نشر الصفحة', is_published: config.is_published });
  } catch (error) {
    console.error('Error toggling publish:', error);
    res.status(500).json({ success: false, message: 'فشل في تغيير حالة النشر' });
  }
});

// POST reset to defaults
app.post('/api/admin/reset', verifyApiSecret, (req, res) => {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const defaults = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
      fs.writeFileSync(CONFIG_PATH, defaults, 'utf8');
    }
    res.json({ success: true, message: 'تم إعادة الإعدادات الافتراضية' });
  } catch (error) {
    console.error('Error resetting config:', error);
    res.status(500).json({ success: false, message: 'فشل في إعادة الإعدادات' });
  }
});

// ─── Serve landing page ───
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[LANDING PAGE] Server running on port ${PORT}`);
});

module.exports = app;
