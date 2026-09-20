require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);
const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
const uploadsDir = process.env.UPLOADS_DIR || path.join(rootDir, 'uploads');
const adminEmail = (process.env.ADMIN_EMAIL || 'majdboughanmi012@gmail.com').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || '33070';
const liveSiteUrl = String(process.env.LIVE_SITE_URL || '').trim().replace(/\/$/, '');
const liveSyncToken = String(process.env.LIVE_SYNC_TOKEN || '').trim();

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new sqlite3(path.join(dataDir, 'avielle.db'));

const storage = multer.diskStorage({
  destination: (_, __, callback) => callback(null, uploadsDir),
  filename: (_, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 30 },
  fileFilter: (_, file, callback) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
    ];
    if (!allowed.includes(file.mimetype)) {
      return callback(new Error('Only image uploads are allowed.'));
    }
    callback(null, true);
  }
});

const DEFAULT_CATEGORIES = ['Handbags', 'Dresses', 'Jewelry', 'Perfume', 'Home Decor', 'Candles', 'Accessories', 'Gifts','Beauty', 'Shoes', 'Scarves', 'Hats', 'Watches', 'Sunglasses', 'Stationery', 'Tech Accessories '];
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'The Verona Tote',
    slug: 'the-verona-tote',
    category: 'Handbags',
    price: 420,
    salePrice: 360,
    description: 'A softly structured leather tote finished with brushed gold hardware and room for everyday essentials.',
    stock: 12,
    active: 1,
    badge: 'Bestseller',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 2,
    name: 'Soleil Silk Dress',
    slug: 'soleil-silk-dress',
    category: 'Dresses',
    price: 280,
    salePrice: null,
    description: 'An airy silk silhouette with a flattering drape, perfect for evenings and polished daytime events.',
    stock: 8,
    active: 1,
    badge: 'New',
    rating: 4,
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 3,
    name: 'Aurora Necklace',
    slug: 'aurora-necklace',
    category: 'Jewelry',
    price: 180,
    salePrice: 150,
    description: 'A delicate necklace designed to layer beautifully with everyday neutrals and dressy occasion looks.',
    stock: 15,
    active: 1,
    badge: 'Sale',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 4,
    name: 'Velvet Bloom Perfume',
    slug: 'velvet-bloom-perfume',
    category: 'Perfume',
    price: 140,
    salePrice: null,
    description: 'A warm floral fragrance with soft rose, amber, and vanilla notes for an elegant signature trail.',
    stock: 19,
    active: 1,
    badge: 'Signature',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 5,
    name: 'Luna Accent Table',
    slug: 'luna-accent-table',
    category: 'Home Decor',
    price: 360,
    salePrice: 310,
    description: 'Elegant side table with sculptural lines that adds a quiet sense of refinement to any room.',
    stock: 5,
    active: 1,
    badge: 'Limited',
    rating: 4,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 6,
    name: 'Cedar & Fig Candle',
    slug: 'cedar-fig-candle',
    category: 'Candles',
    price: 52,
    salePrice: null,
    description: 'A warm cedar and fig scent designed to create a cozy, elevated atmosphere in any space.',
    stock: 26,
    active: 1,
    badge: 'Top Rated',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1602872029705-7b5f7c1ea9d0?auto=format&fit=crop&w=900&q=80'
  }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendResetCodeEmail(email, code) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Avielle reset] Reset code for ${email}: ${code}`);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || smtpUser,
    to: email,
    subject: 'Avielle admin password reset code',
    html: `
      <p>Your Avielle admin reset code is:</p>
      <h2>${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `
  }).then(() => true).catch((error) => {
    console.error('[Avielle reset email] Failed to send:', error.message);
    return false;
  });
}

function productImageRows(productId) {
  return db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC').all(productId);
}

function productMediaRows(productId) {
  return db.prepare('SELECT * FROM product_media WHERE product_id = ? ORDER BY sort_order ASC, id ASC').all(productId);
}

function serializeProduct(product) {
  const images = productImageRows(product.id);
  const media = productMediaRows(product.id);
  const categoryIds = db.prepare('SELECT category_id FROM product_categories WHERE product_id = ? ORDER BY category_id').all(product.id).map((row) => row.category_id);
  const primaryImage = images.find((image) => image.is_primary === 1) || images[0] || { image_url: product.image || '' };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category_name || product.category,
    category_names: product.category_names || product.category_name || product.category || '',
    category_id: product.category_id,
    category_ids: categoryIds.length ? categoryIds : (product.category_id ? [product.category_id] : []),
    sku: product.sku || '',
    status: product.status || (product.active ? 'published' : 'archived'),
    price: Number(product.price),
    salePrice: product.sale_price ? Number(product.sale_price) : null,
    description: product.description,
    brand: product.brand || '',
    tags: product.tags ? String(product.tags).split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    low_stock_threshold: product.low_stock_threshold,
    barcode: product.barcode || '',
    weight: product.weight,
    dimensions: product.dimensions || '',
    meta_title: product.meta_title || '',
    meta_description: product.meta_description || '',
    meta_keywords: product.meta_keywords || '',
    stock: Number(product.stock),
    active: Boolean(product.active),
    badge: product.badge || 'New',
    rating: Number(product.rating || 4),
    image: primaryImage ? primaryImage.image_url : (product.image || ''),
    images: images.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      is_primary: Boolean(image.is_primary),
      sort_order: image.sort_order
    })),
    videos: media.map((video) => ({
      id: video.id,
      type: video.media_type,
      url: video.media_url,
      title: video.title || '',
      sort_order: video.sort_order
    })),
    created_at: product.created_at,
    updated_at: product.updated_at
  };
}

function ensureAdminUser() {
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD must be configured before starting Avielle.');
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  db.prepare(`
    INSERT OR IGNORE INTO profiles (email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(adminEmail, passwordHash);

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(adminEmail);
  if (user && user.password_hash !== passwordHash) {
    db.prepare('UPDATE profiles SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(passwordHash, adminEmail);
  }
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      first_name TEXT,
      last_name TEXT,
      reset_code TEXT,
      reset_expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      price REAL NOT NULL DEFAULT 0,
      sale_price REAL,
      description TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      badge TEXT,
      rating REAL DEFAULT 4,
      image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('video_url', 'video_upload')),
      media_url TEXT NOT NULL,
      title TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      product_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      country TEXT NOT NULL,
      governorate TEXT NOT NULL,
      city TEXT NOT NULL,
      avenue_street TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      promo_code TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      product_price_snapshot REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
      discount_value REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      starts_at TEXT NOT NULL,
      expires_at TEXT,
      max_uses INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      min_order REAL NOT NULL DEFAULT 0,
      max_discount_amount REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promo_code_usages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promo_code_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      used_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT NOT NULL UNIQUE,
      title TEXT,
      description TEXT,
      image_url TEXT,
      button_text TEXT,
      button_link TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const addColumnIfMissing = (table, column, definition) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((entry) => entry.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  addColumnIfMissing('categories', 'parent_id', 'INTEGER');
  addColumnIfMissing('categories', 'description', 'TEXT');
  addColumnIfMissing('categories', 'image_url', 'TEXT');
  addColumnIfMissing('products', 'sku', 'TEXT');
  addColumnIfMissing('products', 'status', "TEXT NOT NULL DEFAULT 'published'");
  addColumnIfMissing('products', 'brand', 'TEXT');
  addColumnIfMissing('products', 'tags', 'TEXT');
  addColumnIfMissing('products', 'low_stock_threshold', 'INTEGER');
  addColumnIfMissing('products', 'barcode', 'TEXT');
  addColumnIfMissing('products', 'weight', 'REAL');
  addColumnIfMissing('products', 'dimensions', 'TEXT');
  addColumnIfMissing('products', 'meta_title', 'TEXT');
  addColumnIfMissing('products', 'meta_description', 'TEXT');
  addColumnIfMissing('products', 'meta_keywords', 'TEXT');

  const profileColumns = db.prepare('PRAGMA table_info(profiles)').all();
  const hasResetCode = profileColumns.some((column) => column.name === 'reset_code');
  const hasResetExpiry = profileColumns.some((column) => column.name === 'reset_expires_at');

  if (!hasResetCode) {
    db.exec('ALTER TABLE profiles ADD COLUMN reset_code TEXT');
  }

  if (!hasResetExpiry) {
    db.exec('ALTER TABLE profiles ADD COLUMN reset_expires_at TEXT');
  }

  DEFAULT_CATEGORIES.forEach((category, index) => {
    const slug = slugify(category);
    db.prepare(`
      INSERT OR IGNORE INTO categories (name, slug, sort_order, active, created_at, updated_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(category, slug, index + 1);
  });

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (categoryCount === 0) {
    DEFAULT_PRODUCTS.forEach((product) => {
      const categoryRow = db.prepare('SELECT id FROM categories WHERE name = ?').get(product.category);
      const row = {
        name: product.name,
        slug: product.slug || slugify(product.name),
        category_id: categoryRow ? categoryRow.id : null,
        price: product.price,
        sale_price: product.salePrice,
        description: product.description,
        stock: product.stock,
        active: product.active,
        badge: product.badge,
        rating: product.rating,
        image: product.image
      };

      const result = db.prepare(`
        INSERT INTO products (name, slug, category_id, price, sale_price, description, stock, active, badge, rating, image, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        row.name,
        row.slug,
        row.category_id,
        row.price,
        row.sale_price,
        row.description,
        row.stock,
        row.active,
        row.badge,
        row.rating,
        row.image
      );

      db.prepare(`
        INSERT OR REPLACE INTO product_images (id, product_id, image_url, sort_order, is_primary, created_at)
        VALUES (?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
      `).run(1 + result.lastInsertRowid, result.lastInsertRowid, row.image);
    });
  }

  const websiteRows = [
    ['site_name', 'Avielle'],
    ['logo_url', ''],
    ['hero_headline', 'Luxury made personal.'],
    ['hero_subtitle', 'Avielle brings together refined fashion, beauty, home treasures, and thoughtful gifting in one beautifully considered collection.'],
    ['hero_button_text', 'Shop Now'],
    ['hero_button_link', '/shop'],
    ['promo_title', 'A softer way to gift beautifully.'],
    ['promo_description', 'Explore our curated gift edit, thoughtfully wrapped and ready to delight.'],
    ['promo_button_text', 'Discover Gift Edit'],
    ['promo_button_link', '/shop'],
    ['about_title', 'Curated for elegant living'],
    ['about_description', 'Thoughtful essentials for life well styled.']
  ];

  websiteRows.forEach(([key, value]) => {
    db.prepare(`
      INSERT OR IGNORE INTO website_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(key, value);
  });

  const homepageKeys = [
    'hero',
    'promo',
    'about'
  ];

  homepageKeys.forEach((key, index) => {
    db.prepare(`
      INSERT OR IGNORE INTO homepage_sections (section_key, title, description, enabled, sort_order, updated_at)
      VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
    `).run(key, key === 'hero' ? 'Hero section' : key === 'promo' ? 'Promotional section' : 'About section', '', index + 1);
  });

  ensureAdminUser();
}

function authRequired(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/admin/login');
  }
  next();
}

function blockPrivateFiles(req, res, next) {
  const blockedPaths = new Set([
    '/.env',
    '/package.json',
    '/package-lock.json',
    '/server.js',
    '/admin.html'
  ]);

  if (blockedPaths.has(req.path)) {
    return res.status(404).send('Not found');
  }

  next();
}

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function getPublicProducts(filters = {}) {
  const category = filters.category || null;
  const activeOnly = filters.activeOnly !== false;

  let query = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id';
  const clauses = [];
  const params = [];

  if (activeOnly) {
    clauses.push('p.active = 1');
  }

  if (category) {
    clauses.push('c.name = ?');
    params.push(category);
  }

  if (clauses.length) {
    query += ' WHERE ' + clauses.join(' AND ');
  }

  query += ' ORDER BY p.updated_at DESC, p.id DESC';

  const products = db.prepare(query).all(...params);
  return products.map((product) => serializeProduct(product));
}

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again in a few minutes.'
}));
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.get('/health', (_, res) => {
  res.json({ success: true, service: 'avielle', status: 'ok' });
});
app.use(blockPrivateFiles);
app.use(express.static(rootDir, { dotfiles: 'deny' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'avielle-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12
  },
  store: new SQLiteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000
    }
  })
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/admin/login', (_, res) => {
  res.sendFile(path.join(rootDir, 'admin-login.html'));
});

app.get('/admin', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/dashboard', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/products', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/products/new', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/products/:id/edit', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/orders', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/orders/:id', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/promo-codes', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/website', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/settings', authRequired, (_, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normaliseEmail(req.body.email);

  if (!email) {
    return jsonError(res, 400, 'Email is required.');
  }

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!user) {
    return jsonError(res, 404, 'No admin account was found for that email.');
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare('UPDATE profiles SET reset_code = ?, reset_expires_at = ?, updated_at = datetime("now") WHERE id = ?').run(code, expiresAt, user.id);

  const wasSent = await sendResetCodeEmail(email, code);
  return res.json({
    success: true,
    message: wasSent ? 'A verification code has been sent to your email.' : 'A verification code was created. Use it to reset your password.',
    ...(process.env.NODE_ENV !== 'production' && !wasSent ? { code } : {})
  });
});

app.post('/api/auth/verify-reset-code', (req, res) => {
  const email = normaliseEmail(req.body.email);
  const code = String(req.body.code || '').trim();

  if (!email || !code) {
    return jsonError(res, 400, 'Email and reset code are required.');
  }

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!user || !user.reset_code) {
    return jsonError(res, 400, 'No active reset code was found for this account.');
  }

  const expiresAt = user.reset_expires_at ? new Date(user.reset_expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    db.prepare('UPDATE profiles SET reset_code = NULL, reset_expires_at = NULL, updated_at = datetime("now") WHERE id = ?').run(user.id);
    return jsonError(res, 400, 'This reset code has expired. Please request a new one.');
  }

  if (String(user.reset_code) !== String(code)) {
    return jsonError(res, 400, 'The verification code is incorrect.');
  }

  return res.json({ success: true, message: 'Code verified. You can now set a new password.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const email = normaliseEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!email || !code || !newPassword) {
    return jsonError(res, 400, 'Email, reset code, and new password are required.');
  }

  if (newPassword.length < 6) {
    return jsonError(res, 400, 'Your new password must be at least 6 characters long.');
  }

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!user || !user.reset_code) {
    return jsonError(res, 400, 'No active reset code was found for this account.');
  }

  const expiresAt = user.reset_expires_at ? new Date(user.reset_expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    db.prepare('UPDATE profiles SET reset_code = NULL, reset_expires_at = NULL, updated_at = datetime("now") WHERE id = ?').run(user.id);
    return jsonError(res, 400, 'This reset code has expired. Please request a new one.');
  }

  if (String(user.reset_code) !== String(code)) {
    return jsonError(res, 400, 'The verification code is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE profiles SET password_hash = ?, reset_code = NULL, reset_expires_at = NULL, updated_at = datetime("now") WHERE id = ?').run(passwordHash, user.id);

  return res.json({ success: true, message: 'Password updated successfully. You can now sign in with your new password.' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normaliseEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return jsonError(res, 400, 'Email and password are required.');
  }

  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
  if (!user) {
    return jsonError(res, 401, 'Invalid login credentials.');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return jsonError(res, 401, 'Invalid login credentials.');
  }

  if (user.role !== 'admin') {
    return jsonError(res, 403, 'You do not have administrator access.');
  }

  req.session.user = { id: user.id, email: user.email, role: user.role };
  return res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  return res.json({ success: true, authenticated: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

app.post('/api/internal/sync/product', (req, res) => {
  if (!liveSyncToken || req.get('x-avielle-sync-token') !== liveSyncToken) {
    return jsonError(res, 401, 'Invalid live sync token.');
  }

  const input = req.body || {};
  const name = String(input.name || '').trim();
  const slug = slugify(input.slug || name);
  const price = Number(input.price);
  const stock = Number(input.stock);
  const status = ['draft', 'published', 'archived'].includes(input.status) ? input.status : 'published';

  if (!name || !slug || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    return jsonError(res, 400, 'Invalid product data for live sync.');
  }

  try {
    const categoryName = String(input.category || '').trim();
    let categoryId = null;
    if (categoryName) {
      let category = db.prepare('SELECT id FROM categories WHERE name = ?').get(categoryName);
      if (!category) {
        const categoryResult = db.prepare("INSERT INTO categories (name, slug, active, sort_order, created_at, updated_at) VALUES (?, ?, 1, 0, datetime('now'), datetime('now'))").run(categoryName, slugify(categoryName));
        category = { id: categoryResult.lastInsertRowid };
      }
      categoryId = category.id;
    }

    const existing = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    const values = [name, slug, categoryId, price, input.salePrice == null ? null : Number(input.salePrice), String(input.description || '').trim(), stock, status === 'published' ? 1 : 0, status, String(input.sku || '').trim(), String(input.brand || '').trim(), Array.isArray(input.tags) ? input.tags.join(', ') : String(input.tags || ''), input.image || '', new Date().toISOString()];
    const productId = existing
      ? (db.prepare('UPDATE products SET name = ?, slug = ?, category_id = ?, price = ?, sale_price = ?, description = ?, stock = ?, active = ?, status = ?, sku = ?, brand = ?, tags = ?, image = ?, updated_at = ? WHERE id = ?').run(...values, existing.id), existing.id)
      : db.prepare("INSERT INTO products (name, slug, category_id, price, sale_price, description, stock, active, status, sku, brand, tags, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)").run(...values).lastInsertRowid;

    if (input.image) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      db.prepare("INSERT INTO product_images (product_id, image_url, sort_order, is_primary, created_at) VALUES (?, ?, 0, 1, datetime('now'))").run(productId, String(input.image));
    }

    return res.json({ success: true, product: serializeProduct(adminProductRow(productId)) });
  } catch (error) {
    return jsonError(res, 400, error.message || 'Unable to sync product.');
  }
});

app.get('/api/categories', (_, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, categories });
});

app.get('/api/products', (req, res) => {
  const category = req.query.category ? String(req.query.category) : null;
  const activeOnly = req.query.active !== 'false';
  const products = getPublicProducts({ category, activeOnly });
  res.json({ success: true, products });
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const productRow = db.prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id);

  if (!productRow) {
    return jsonError(res, 404, 'Product not found.');
  }

  if (productRow.active !== 1) {
    return jsonError(res, 404, 'This product is not available.');
  }

  return res.json({ success: true, product: serializeProduct(productRow) });
});

app.get('/api/website', (_, res) => {
  const settings = db.prepare('SELECT setting_key, setting_value FROM website_settings').all();
  const config = Object.fromEntries(settings.map((setting) => [setting.setting_key, setting.setting_value]));
  res.json({ success: true, site: config });
});

app.get('/api/homepage', (_, res) => {
  const settings = db.prepare('SELECT setting_key, setting_value FROM website_settings').all();
  const config = Object.fromEntries(settings.map((setting) => [setting.setting_key, setting.setting_value]));
  const products = getPublicProducts({ activeOnly: true }).slice(0, 4);

  res.json({
    success: true,
    homepage: {
      hero: {
        headline: config.hero_headline || 'Luxury made personal.',
        subtitle: config.hero_subtitle || 'Refined essentials for everyday living.',
        button_text: config.hero_button_text || 'Shop Now',
        button_link: config.hero_button_link || '/shop',
        image: config.hero_image || 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80'
      },
      promo: {
        title: config.promo_title || 'A softer way to gift beautifully.',
        description: config.promo_description || 'Explore our curated gift edit, thoughtfully wrapped and ready to delight.',
        image: config.promo_image || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80',
        button_text: config.promo_button_text || 'Discover Gift Edit',
        button_link: config.promo_button_link || '/shop'
      },
      about: {
        title: config.about_title || 'Curated for elegant living',
        description: config.about_description || 'Thoughtful essentials for life well styled.',
        image: config.about_image || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80'
      },
      logo: config.logo_url || '',
      featuredProducts: products
    }
  });
});

app.post('/api/promo/validate', (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);

  if (!code) {
    return jsonError(res, 400, 'Invalid promo code.');
  }

  const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(code);
  if (!promo) {
    return jsonError(res, 400, 'Invalid promo code.');
  }

  const now = new Date();
  const startsAt = new Date(promo.starts_at);
  const expiresAt = promo.expires_at ? new Date(promo.expires_at) : null;

  if (promo.active !== 1) {
    return jsonError(res, 400, 'This promo code is currently inactive.');
  }

  if (Number(promo.max_uses) > 0 && Number(promo.usage_count) >= Number(promo.max_uses)) {
    return jsonError(res, 400, 'This promo code has reached its usage limit.');
  }

  if (startsAt > now) {
    return jsonError(res, 400, 'This promo code has not started yet.');
  }

  if (expiresAt && expiresAt < now) {
    return jsonError(res, 400, 'This promo code has expired.');
  }

  if (subtotal < Number(promo.min_order || 0)) {
    return jsonError(res, 400, 'Order total is below the minimum required for this promo code.');
  }

  let discount = 0;
  if (promo.discount_type === 'percentage') {
    discount = subtotal * (Number(promo.discount_value) / 100);
    if (promo.max_discount_amount) {
      discount = Math.min(discount, Number(promo.max_discount_amount));
    }
  } else {
    discount = Number(promo.discount_value);
  }

  const finalTotal = Math.max(0, subtotal - discount);
  return res.json({ success: true, valid: true, code, discount: Number(discount.toFixed(2)), total: Number(finalTotal.toFixed(2)) });
});

app.post('/api/orders', (req, res) => {
  const payload = req.body || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const customer = payload.customer || {};
  const promoCode = payload.promoCode ? String(payload.promoCode).trim().toUpperCase() : '';

  if (!items.length) {
    return jsonError(res, 400, 'Your cart is empty.');
  }

  const requiredFields = ['fullName', 'phone', 'email', 'country', 'governorate', 'city', 'street', 'postalCode'];
  const missing = requiredFields.filter((field) => !String(customer[field] || '').trim());
  if (missing.length) {
    return jsonError(res, 400, 'Please complete all required checkout fields.');
  }

  const email = normaliseEmail(customer.email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonError(res, 400, 'Please provide a valid email address.');
  }

  const transaction = db.transaction(() => {
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(item.id));
      if (!product || product.active !== 1) {
        throw new Error('A selected product is no longer available.');
      }

      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        throw new Error('Invalid quantity selected.');
      }
      if (quantity > Number(product.stock || 0)) {
        throw new Error(`Not enough stock for ${product.name}.`);
      }

      const unitPrice = Number(product.sale_price ?? product.price ?? 0);
      const lineSubtotal = unitPrice * quantity;
      subtotal += lineSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name_snapshot: product.name,
        product_price_snapshot: unitPrice,
        quantity,
        subtotal: lineSubtotal
      });
    }

    let discountAmount = 0;
    let appliedCode = null;

    if (promoCode) {
      const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(promoCode);
      if (!promo) {
        throw new Error('Invalid promo code.');
      }

      const now = new Date();
      const startsAt = new Date(promo.starts_at);
      const expiresAt = promo.expires_at ? new Date(promo.expires_at) : null;

      if (promo.active !== 1) throw new Error('This promo code is inactive.');
      if (startsAt > now) throw new Error('This promo code has not started yet.');
      if (expiresAt && expiresAt < now) throw new Error('This promo code has expired.');
      if (subtotal < Number(promo.min_order || 0)) throw new Error('Order total is below the minimum required for this promo code.');
      if (Number(promo.max_uses) > 0 && Number(promo.usage_count) >= Number(promo.max_uses)) throw new Error('This promo code has reached its usage limit.');

      if (promo.discount_type === 'percentage') {
        discountAmount = subtotal * (Number(promo.discount_value) / 100);
        if (promo.max_discount_amount) {
          discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
        }
      } else {
        discountAmount = Number(promo.discount_value);
      }

      discountAmount = Math.min(discountAmount, subtotal);
      appliedCode = promo.code;
    }

    const total = Math.max(0, subtotal - discountAmount);

    const orderResult = db.prepare(`
      INSERT INTO orders (
        customer_name,
        customer_email,
        customer_phone,
        country,
        governorate,
        city,
        avenue_street,
        postal_code,
        notes,
        subtotal,
        discount_amount,
        total,
        promo_code,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', datetime('now'), datetime('now'))
    `).run(
      String(customer.fullName).trim(),
      email,
      String(customer.phone).trim(),
      String(customer.country).trim(),
      String(customer.governorate).trim(),
      String(customer.city).trim(),
      String(customer.street).trim(),
      String(customer.postalCode).trim(),
      String(customer.notes || '').trim(),
      subtotal,
      discountAmount,
      total,
      appliedCode
    );

    for (const orderItem of orderItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_price_snapshot, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderResult.lastInsertRowid, orderItem.product_id, orderItem.product_name_snapshot, orderItem.product_price_snapshot, orderItem.quantity, orderItem.subtotal);

      db.prepare('UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ?').run(orderItem.quantity, orderItem.product_id);
    }

    if (appliedCode) {
      const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(appliedCode);
      if (promo) {
        db.prepare('UPDATE promo_codes SET usage_count = usage_count + 1, updated_at = datetime("now") WHERE id = ?').run(promo.id);
        db.prepare('INSERT INTO promo_code_usages (promo_code_id, order_id, used_at) VALUES (?, ?, datetime("now"))').run(promo.id, orderResult.lastInsertRowid);
      }
    }

    return {
      orderId: orderResult.lastInsertRowid,
      total,
      subtotal,
      discountAmount,
      promoCode: appliedCode
    };
  });

  try {
    const result = transaction();
    return res.json({ success: true, message: 'Your order has been successfully placed.', order: result });
  } catch (error) {
    return jsonError(res, 400, error.message || 'Something went wrong. Please try again.');
  }
});

app.get('/api/admin/categories', authRequired, (req, res) => {
  const search = String(req.query.search || '').trim();
  const rows = db.prepare(`
    SELECT c.*, parent.name AS parent_name,
      (SELECT COUNT(*) FROM product_categories pc WHERE pc.category_id = c.id) +
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE (? = '' OR c.name LIKE ? OR c.slug LIKE ?)
    ORDER BY c.name COLLATE NOCASE ASC
  `).all(search, `%${search}%`, `%${search}%`);
  res.json({ success: true, categories: rows });
});

app.post('/api/admin/categories', authRequired, upload.single('image'), (req, res) => {
  try {
    const input = req.body || {};
    const name = String(input.name || '').trim();
    const slug = slugify(input.slug || name);
    const parentId = input.parent_id ? Number(input.parent_id) : null;
    if (!name || !slug) return jsonError(res, 400, 'Category name is required.');
    if (parentId && !db.prepare('SELECT id FROM categories WHERE id = ?').get(parentId)) return jsonError(res, 400, 'Parent category was not found.');
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(input.image_url || '').trim();
    const result = db.prepare(`
      INSERT INTO categories (name, slug, parent_id, description, image_url, active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(name, slug, parentId, String(input.description || '').trim(), imageUrl, input.active === 'false' ? 0 : 1, Number(input.sort_order || 0));
    return res.json({ success: true, category: db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) });
  } catch (error) {
    return jsonError(res, 400, error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'A category with this name or slug already exists.' : error.message);
  }
});

app.put('/api/admin/categories/:id', authRequired, upload.single('image'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) return jsonError(res, 404, 'Category not found.');
    const input = req.body || {};
    const name = String(input.name || '').trim();
    const slug = slugify(input.slug || name);
    const parentId = input.parent_id ? Number(input.parent_id) : null;
    if (!name || (parentId && parentId === id)) return jsonError(res, 400, 'Please provide a valid category and parent.');
    if (parentId && !db.prepare('SELECT id FROM categories WHERE id = ?').get(parentId)) return jsonError(res, 400, 'Parent category was not found.');
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (input.remove_image === 'true' ? '' : String(input.image_url ?? existing.image_url ?? '').trim());
    db.prepare(`
      UPDATE categories SET name = ?, slug = ?, parent_id = ?, description = ?, image_url = ?, active = ?, updated_at = datetime('now') WHERE id = ?
    `).run(name, slug, parentId, String(input.description || '').trim(), imageUrl, input.active === 'false' ? 0 : 1, id);
    return res.json({ success: true, category: db.prepare('SELECT * FROM categories WHERE id = ?').get(id) });
  } catch (error) {
    return jsonError(res, 400, error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'A category with this name or slug already exists.' : error.message);
  }
});

app.delete('/api/admin/categories/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!category) return jsonError(res, 404, 'Category not found.');
  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ?').get(id).count + db.prepare('SELECT COUNT(*) AS count FROM product_categories WHERE category_id = ?').get(id).count;
  if (productCount) return jsonError(res, 400, 'Move or remove this category\'s products before deleting it.');
  db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Category deleted.' });
});

function adminProductRow(id) {
  return db.prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id);
}

function normaliseCategoryIds(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

function validateAdminProduct(input) {
  const name = String(input.name || '').trim();
  const price = Number(input.price);
  const salePrice = input.salePrice === '' || input.salePrice == null ? null : Number(input.salePrice);
  const stock = Number(input.stock);
  const status = ['draft', 'published', 'archived'].includes(input.status) ? input.status : 'published';
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    return { error: 'Product name, positive price, and whole-number stock are required.' };
  }
  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) {
    return { error: 'Discounted price must be between zero and the original price.' };
  }
  return { value: { ...input, name, price, salePrice, stock, status } };
}

function saveProductMedia(productId, input, files = {}) {
  const images = Array.isArray(files.images) ? files.images : [];
  const videos = Array.isArray(files.videos) ? files.videos : [];
  const existingImages = db.prepare('SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?').get(productId).count;
  images.forEach((file, index) => {
    db.prepare("INSERT INTO product_images (product_id, image_url, sort_order, is_primary, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run(productId, `/uploads/${file.filename}`, existingImages + index, existingImages === 0 && index === 0 ? 1 : 0);
  });
  const videoUrls = Array.isArray(input.videoUrls) ? input.videoUrls : [];
  const existingVideos = db.prepare('SELECT COUNT(*) AS count FROM product_media WHERE product_id = ?').get(productId).count;
  videoUrls.filter((url) => /^https?:\/\//i.test(String(url).trim())).forEach((url, index) => {
    db.prepare("INSERT INTO product_media (product_id, media_type, media_url, sort_order, created_at) VALUES (?, 'video_url', ?, ?, datetime('now'))").run(productId, String(url).trim(), existingVideos + index);
  });
  videos.forEach((file, index) => {
    db.prepare("INSERT INTO product_media (product_id, media_type, media_url, sort_order, created_at) VALUES (?, 'video_upload', ?, ?, datetime('now'))").run(productId, `/uploads/${file.filename}`, existingVideos + videoUrls.length + index);
  });
}

app.get('/api/admin/catalog/products', authRequired, (req, res) => {
  const search = String(req.query.search || '').trim();
  const categoryId = Number(req.query.category_id || 0);
  const stockStatus = String(req.query.stock_status || '').trim();
  const rows = db.prepare(`
    SELECT DISTINCT p.*, c.name AS category_name,
      COALESCE((SELECT GROUP_CONCAT(cat.name, ', ') FROM product_categories pc JOIN categories cat ON cat.id = pc.category_id WHERE pc.product_id = p.id), c.name) AS category_names
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    WHERE (? = '' OR p.name LIKE ? OR COALESCE(p.sku, '') LIKE ?)
      AND (? = 0 OR pc.category_id = ? OR p.category_id = ?)
      AND (? = '' OR (? = 'out' AND p.stock = 0) OR (? = 'low' AND p.stock > 0 AND p.stock <= COALESCE(p.low_stock_threshold, 5)) OR (? = 'in' AND p.stock > 0))
    ORDER BY p.updated_at DESC, p.id DESC
  `).all(search, `%${search}%`, `%${search}%`, categoryId, categoryId, categoryId, stockStatus, stockStatus, stockStatus, stockStatus);
  res.json({ success: true, products: rows.map(serializeProduct) });
});

app.post('/api/admin/catalog/products/:id/publish-live', authRequired, async (req, res) => {
  if (!liveSiteUrl || !liveSyncToken) {
    return jsonError(res, 400, 'Configure LIVE_SITE_URL and LIVE_SYNC_TOKEN before publishing to Render.');
  }

  const product = adminProductRow(Number(req.params.id));
  if (!product) return jsonError(res, 404, 'Product not found.');

  try {
    const response = await fetch(`${liveSiteUrl}/api/internal/sync/product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Avielle-Sync-Token': liveSyncToken
      },
      body: JSON.stringify(serializeProduct(product))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return jsonError(res, response.status, result.message || 'Render rejected the product sync.');
    return res.json({ success: true, message: 'Product published to Render.', product: result.product });
  } catch (error) {
    return jsonError(res, 502, `Unable to reach Render: ${error.message}`);
  }
});

app.post('/api/admin/catalog/products', authRequired, upload.fields([{ name: 'images', maxCount: 30 }, { name: 'videos', maxCount: 10 }]), (req, res) => {
  try {
    const input = JSON.parse(req.body.product || '{}');
    const validation = validateAdminProduct(input);
    if (validation.error) return jsonError(res, 400, validation.error);
    const categoryIds = normaliseCategoryIds(input.categoryIds);
    if (categoryIds.some((id) => !db.prepare('SELECT id FROM categories WHERE id = ?').get(id))) return jsonError(res, 400, 'One or more categories were not found.');
    const primaryCategory = categoryIds[0] || null;
    const result = db.prepare(`
      INSERT INTO products (name, slug, category_id, price, sale_price, description, stock, active, status, sku, brand, tags, low_stock_threshold, barcode, weight, dimensions, meta_title, meta_description, meta_keywords, badge, rating, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4, '', datetime('now'), datetime('now'))
    `).run(validation.value.name, slugify(input.slug || validation.value.name), primaryCategory, validation.value.price, validation.value.salePrice, String(input.description || input.shortDescription || '').trim(), validation.value.stock, validation.value.status === 'published' ? 1 : 0, validation.value.status, String(input.sku || '').trim(), String(input.brand || '').trim(), Array.isArray(input.tags) ? input.tags.join(', ') : String(input.tags || ''), input.lowStockThreshold ? Number(input.lowStockThreshold) : null, String(input.barcode || '').trim(), input.weight ? Number(input.weight) : null, String(input.dimensions || '').trim(), String(input.metaTitle || '').trim(), String(input.metaDescription || '').trim(), String(input.metaKeywords || '').trim(), String(input.badge || 'New'));
    const productId = result.lastInsertRowid;
    categoryIds.forEach((categoryId) => db.prepare('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)').run(productId, categoryId));
    saveProductMedia(productId, input, req.files || {});
    const product = adminProductRow(productId);
    if (!db.prepare('SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?').get(productId).count) {
      db.prepare("INSERT INTO product_images (product_id, image_url, sort_order, is_primary, created_at) VALUES (?, ?, 0, 1, datetime('now'))").run(productId, String(input.image || ''));
    }
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return jsonError(res, 400, error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Product name, slug, or SKU must be unique.' : error.message);
  }
});

app.put('/api/admin/catalog/products/:id', authRequired, upload.fields([{ name: 'images', maxCount: 30 }, { name: 'videos', maxCount: 10 }]), (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!adminProductRow(productId)) return jsonError(res, 404, 'Product not found.');
    const input = JSON.parse(req.body.product || '{}');
    const validation = validateAdminProduct(input);
    if (validation.error) return jsonError(res, 400, validation.error);
    const categoryIds = normaliseCategoryIds(input.categoryIds);
    if (categoryIds.some((id) => !db.prepare('SELECT id FROM categories WHERE id = ?').get(id))) return jsonError(res, 400, 'One or more categories were not found.');
    db.prepare(`UPDATE products SET name = ?, slug = ?, category_id = ?, price = ?, sale_price = ?, description = ?, stock = ?, active = ?, status = ?, sku = ?, brand = ?, tags = ?, low_stock_threshold = ?, barcode = ?, weight = ?, dimensions = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, updated_at = datetime('now') WHERE id = ?`).run(validation.value.name, slugify(input.slug || validation.value.name), categoryIds[0] || null, validation.value.price, validation.value.salePrice, String(input.description || input.shortDescription || '').trim(), validation.value.stock, validation.value.status === 'published' ? 1 : 0, validation.value.status, String(input.sku || '').trim(), String(input.brand || '').trim(), Array.isArray(input.tags) ? input.tags.join(', ') : String(input.tags || ''), input.lowStockThreshold ? Number(input.lowStockThreshold) : null, String(input.barcode || '').trim(), input.weight ? Number(input.weight) : null, String(input.dimensions || '').trim(), String(input.metaTitle || '').trim(), String(input.metaDescription || '').trim(), String(input.metaKeywords || '').trim(), productId);
    db.prepare('DELETE FROM product_categories WHERE product_id = ?').run(productId);
    categoryIds.forEach((categoryId) => db.prepare('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)').run(productId, categoryId));
    if (input.removeImageIds) {
      const imageIds = Array.isArray(input.removeImageIds) ? input.removeImageIds : [];
      imageIds.forEach((imageId) => db.prepare('DELETE FROM product_images WHERE id = ? AND product_id = ?').run(Number(imageId), productId));
    }
    if (input.removeVideoIds) {
      const videoIds = Array.isArray(input.removeVideoIds) ? input.removeVideoIds : [];
      videoIds.forEach((videoId) => db.prepare('DELETE FROM product_media WHERE id = ? AND product_id = ?').run(Number(videoId), productId));
    }
    saveProductMedia(productId, input, req.files || {});
    const product = adminProductRow(productId);
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return jsonError(res, 400, error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Product name, slug, or SKU must be unique.' : error.message);
  }
});

app.delete('/api/admin/catalog/products/:id', authRequired, (req, res) => {
  const productId = Number(req.params.id);
  if (!adminProductRow(productId)) return jsonError(res, 404, 'Product not found.');
  db.prepare("UPDATE products SET active = 0, status = 'archived', updated_at = datetime('now') WHERE id = ?").run(productId);
  return res.json({ success: true, message: 'Product archived.' });
});

app.get('/api/admin/products', authRequired, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.updated_at DESC, p.id DESC
  `).all();

  res.json({ success: true, products: products.map((product) => serializeProduct(product)) });
});

app.post('/api/admin/products', authRequired, upload.array('images'), (req, res) => {
  try {
    const requestBody = req.body || {};
    const productInput = requestBody.product ? JSON.parse(requestBody.product) : requestBody;
    const name = String(productInput.name || '').trim();
    const description = String(productInput.description || '').trim();
    const categoryName = String(productInput.category || '').trim();
    const price = Number(productInput.price || 0);
    const stock = Number(productInput.stock || 0);
    const imageUrl = String(productInput.image || '').trim();

    if (!name || !description || !categoryName || !Number.isFinite(price) || price <= 0) {
      return jsonError(res, 400, 'Please complete all required product details.');
    }

    let categoryRow = db.prepare('SELECT * FROM categories WHERE name = ?').get(categoryName);
    if (!categoryRow) {
      const slug = slugify(categoryName);
      const insertResult = db.prepare('INSERT INTO categories (name, slug, active, sort_order, created_at, updated_at) VALUES (?, ?, 1, 0, datetime("now"), datetime("now"))').run(categoryName, slug);
      categoryRow = db.prepare('SELECT * FROM categories WHERE id = ?').get(insertResult.lastInsertRowid);
    }

    const slug = slugify(productInput.slug || name);
    const productResult = db.prepare(`
      INSERT INTO products (name, slug, category_id, price, sale_price, description, stock, active, badge, rating, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 4, ?, datetime('now'), datetime('now'))
    `).run(name, slug, categoryRow.id, price, productInput.salePrice ? Number(productInput.salePrice) : null, description, stock, productInput.badge || 'New', imageUrl || '');

    const productId = productResult.lastInsertRowid;
    const uploadedImages = Array.isArray(req.files) ? req.files : [];
    const imageEntries = [];

    if (imageUrl) {
      imageEntries.push({ image_url: imageUrl, is_primary: 1 });
    }

    uploadedImages.forEach((file, index) => {
      imageEntries.push({
        image_url: `/uploads/${file.filename}`,
        is_primary: imageEntries.length === 0 && !imageUrl ? true : false,
        sort_order: index
      });
    });

    if (imageEntries.length === 0) {
      imageEntries.push({ image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80', is_primary: true, sort_order: 0 });
    }

    imageEntries.forEach((imageEntry, index) => {
      db.prepare(`
        INSERT INTO product_images (product_id, image_url, sort_order, is_primary, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(productId, imageEntry.image_url, index, imageEntry.is_primary ? 1 : 0);
    });

    const product = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(productId);

    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    return jsonError(res, 500, error.message || 'Something went wrong while creating the product.');
  }
});

app.put('/api/admin/products/:id', authRequired, upload.array('images'), (req, res) => {
  try {
    const productId = Number(req.params.id);
    const productRow = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!productRow) {
      return jsonError(res, 404, 'Product not found.');
    }

    const requestBody = req.body || {};
    const productInput = requestBody.product ? JSON.parse(requestBody.product) : requestBody;
    const name = String(productInput.name || '').trim();
    const description = String(productInput.description || '').trim();
    const categoryName = String(productInput.category || '').trim();
    const price = Number(productInput.price || 0);
    const stock = Number(productInput.stock || 0);

    if (!name || !description || !categoryName || !Number.isFinite(price) || price <= 0) {
      return jsonError(res, 400, 'Please complete all required product details.');
    }

    let categoryRow = db.prepare('SELECT * FROM categories WHERE name = ?').get(categoryName);
    if (!categoryRow) {
      const slug = slugify(categoryName);
      const insertResult = db.prepare('INSERT INTO categories (name, slug, active, sort_order, created_at, updated_at) VALUES (?, ?, 1, 0, datetime("now"), datetime("now"))').run(categoryName, slug);
      categoryRow = db.prepare('SELECT * FROM categories WHERE id = ?').get(insertResult.lastInsertRowid);
    }

    const slug = slugify(productInput.slug || name);
    db.prepare(`
      UPDATE products
      SET name = ?, slug = ?, category_id = ?, price = ?, sale_price = ?, description = ?, stock = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, slug, categoryRow.id, price, productInput.salePrice ? Number(productInput.salePrice) : null, description, stock, productId);

    if (Array.isArray(req.files) && req.files.length) {
      const existingCount = db.prepare('SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?').get(productId).count;
      req.files.forEach((file, index) => {
        const isPrimary = existingCount === 0 && index === 0 ? 1 : 0;
        db.prepare('INSERT INTO product_images (product_id, image_url, sort_order, is_primary, created_at) VALUES (?, ?, ?, ?, datetime("now"))').run(productId, `/uploads/${file.filename}`, existingCount + index, isPrimary);
      });
    }

    const updatedProduct = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(productId);

    return res.json({ success: true, product: serializeProduct(updatedProduct) });
  } catch (error) {
    return jsonError(res, 500, error.message || 'Something went wrong while updating the product.');
  }
});

app.delete('/api/admin/products/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) {
    return jsonError(res, 404, 'Product not found.');
  }

  db.prepare('UPDATE products SET active = 0, updated_at = datetime("now") WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Product deleted successfully.' });
});

app.get('/api/admin/orders', authRequired, (_, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json({ success: true, orders });
});

app.patch('/api/admin/orders/:id/status', authRequired, (req, res) => {
  const orderId = Number(req.params.id);
  const status = String(req.body.status || '').trim();
  const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'];

  if (!validStatuses.includes(status)) {
    return jsonError(res, 400, 'Invalid order status.');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return jsonError(res, 404, 'Order not found.');
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, orderId);
  return res.json({ success: true, message: 'Order status updated.' });
});

app.get('/api/admin/website', authRequired, (_, res) => {
  const settings = db.prepare('SELECT setting_key, setting_value FROM website_settings').all();
  const config = Object.fromEntries(settings.map((setting) => [setting.setting_key, setting.setting_value]));
  res.json({ success: true, settings: config });
});

app.post('/api/admin/website', authRequired, (req, res) => {
  const updates = req.body || {};
  const entries = Object.entries(updates);

  if (!entries.length) {
    return jsonError(res, 400, 'No website values were supplied.');
  }

  const transaction = db.transaction(() => {
    entries.forEach(([key, value]) => {
      db.prepare('UPDATE website_settings SET setting_value = ?, updated_at = datetime("now") WHERE setting_key = ?').run(String(value ?? ''), key);
    });
  });

  try {
    transaction();
    return res.json({ success: true, message: 'Website settings updated.' });
  } catch (error) {
    return jsonError(res, 500, error.message || 'Something went wrong while saving website settings.');
  }
});

app.get('/api/admin/promo-codes', authRequired, (_, res) => {
  const codes = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
  res.json({ success: true, codes });
});

app.post('/api/admin/promo-codes', authRequired, (req, res) => {
  const payload = req.body || {};
  const code = String(payload.code || '').trim().toUpperCase();
  const discountType = String(payload.discount_type || '').trim();
  const discountValue = Number(payload.discount_value || 0);

  if (!code || !['percentage', 'fixed'].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0) {
    return jsonError(res, 400, 'Please provide a valid promo code and discount value.');
  }

  const existing = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(code);
  if (existing) {
    return jsonError(res, 400, 'This promo code already exists.');
  }

  const row = db.prepare(`
    INSERT INTO promo_codes (code, discount_type, discount_value, active, starts_at, expires_at, max_uses, usage_count, min_order, max_discount_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))
  `).run(code, discountType, discountValue, payload.active === false ? 0 : 1, payload.starts_at || new Date().toISOString(), payload.expires_at || null, payload.max_uses || 0, payload.min_order || 0, payload.max_discount_amount || null);

  return res.json({ success: true, promo: db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(row.lastInsertRowid) });
});

app.get('/api/admin/dashboard', authRequired, (_, res) => {
  const stats = {
    totalProducts: db.prepare('SELECT COUNT(*) AS count FROM products').get().count,
    activeProducts: db.prepare('SELECT COUNT(*) AS count FROM products WHERE active = 1').get().count,
    lowStockProducts: db.prepare('SELECT COUNT(*) AS count FROM products WHERE stock <= 5').get().count,
    pendingOrders: db.prepare('SELECT COUNT(*) AS count FROM orders WHERE status = "Pending"').get().count,
    totalOrders: db.prepare('SELECT COUNT(*) AS count FROM orders').get().count,
    totalPromoCodes: db.prepare('SELECT COUNT(*) AS count FROM promo_codes').get().count,
    recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all()
  };

  res.json({ success: true, stats });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return jsonError(res, 400, 'Image upload failed. Please try a smaller file or fewer images.');
  }
  if (err) {
    return jsonError(res, 500, 'Something went wrong. Please try again.');
  }
  next();
});

initDatabase();

app.listen(port, () => {
  console.log(`Avielle backend running on http://localhost:${port}`);
  console.log(`Admin login: http://localhost:${port}/admin/login`);
});
