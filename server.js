const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = 3000;

// ── Crear carpeta /materiales si no existe ──
const materialesDir = path.join(__dirname, 'materiales');
if (!fs.existsSync(materialesDir)) fs.mkdirSync(materialesDir);

// ── Middlewares ──
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500',
           'http://127.0.0.1:3000', 'http://localhost:3000',
           'null'],  // Live Server abre con origin "null" a veces
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ── Servir imágenes de materiales como archivos estáticos ──
app.use('/materiales', express.static(materialesDir));

// ── Configuración de Multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, materialesDir),
  filename: (req, file, cb) => {
    const ts  = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    // Nombre limpio: timestamp + nombre original sanitizado
    const base = path.basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .substring(0, 40);
    cb(null, `${ts}_${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  }
});

// ── POST /upload ── Subir imagen de material ──
app.post('/upload', upload.single('imagen'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }
 const url = `${req.protocol}://${req.get('host')}/materiales/${req.file.filename}`;
  console.log(`[UPLOAD] ${req.file.filename} → ${url}`);
  res.json({ url, filename: req.file.filename });
});

// ── DELETE /materiales/:filename ── Eliminar imagen del disco (opcional) ──
app.delete('/materiales/:filename', (req, res) => {
  const filePath = path.join(materialesDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[DELETE] ${req.params.filename}`);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'Archivo no encontrado.' });
  }
});

// ── GET /health ── Ping para verificar que el servidor está corriendo ──
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));

// ── Error handler de Multer ──
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SANTOYO HNOS — Servidor de Materiales      ║');
  console.log(`║   http://localhost:${PORT}                        ║`);
  console.log(`║   Imágenes en: ${materialesDir} ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
