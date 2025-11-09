# Panduan Deploy ke Vercel

## Persiapan

Project ini sudah dikonfigurasi untuk deployment di Vercel dengan file `vercel.json` yang sudah siap pakai.

## Langkah-Langkah Deployment

### 1. Install Vercel CLI (Opsional)

```bash
npm install -g vercel
```

### 2. Deploy via Vercel CLI

```bash
# Login ke Vercel
vercel login

# Deploy ke preview
vercel

# Deploy ke production
vercel --prod
```

### 3. Deploy via GitHub (Recommended)

1. Push code Anda ke GitHub repository
2. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
3. Klik "Add New Project"
4. Import repository GitHub Anda
5. Vercel akan otomatis mendeteksi konfigurasi Express
6. Klik "Deploy"

## Environment Variables yang Diperlukan

Setelah project di-import ke Vercel, Anda perlu menambahkan environment variables berikut di **Project Settings → Environment Variables**:

### Required Variables:

```
JWT_SECRET=<your-secure-random-string>
DATABASE_URL=<your-postgresql-connection-string>
```

### Optional Variables:

```
ADMIN_WHATSAPP_NUMBER=<your-whatsapp-number>
NODE_ENV=production
```

### Generate JWT_SECRET:

Gunakan command berikut untuk generate JWT_SECRET yang aman:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database Setup

Project ini menggunakan PostgreSQL. Untuk Vercel deployment:

### Opsi 1: Vercel Postgres (Recommended)

1. Di Vercel Dashboard, pilih project Anda
2. Klik tab "Storage"
3. Klik "Create Database" → Pilih "Postgres"
4. Vercel akan otomatis menambahkan `DATABASE_URL` ke environment variables

### Opsi 2: External Database

Gunakan PostgreSQL dari provider lain seperti:
- Supabase
- Neon
- Railway
- ElephantSQL

Tambahkan connection string ke environment variable `DATABASE_URL`.

## Fitur yang Sudah Dikonfigurasi

✅ Express.js server dengan routing otomatis
✅ CORS headers untuk API dengan preflight OPTIONS support
✅ Static file serving untuk folder `public/`
✅ Function timeout 60 detik (configurable)
✅ Git-ready dengan .gitignore lengkap
✅ Authentication via email/password (GitHub OAuth telah dihapus)
✅ Vercel serverless function ready di `api/index.js`
✅ Auto-initialization untuk database dan routes
✅ Environment detection (Vercel vs Local)

## Struktur File Penting

```
├── api/
│   └── index.js        # Vercel serverless function entry point
├── server.js           # Entry point untuk local development
├── vercel.json         # Konfigurasi Vercel
├── package.json        # Dependencies
├── .gitignore          # Git ignore rules
├── routes/             # API routes (auto-loaded)
├── models/             # Database models (Sequelize)
├── middleware/         # Auth & middleware
├── services/           # RouteManager & EndpointSync
├── utils/              # Validation & HTTPClient
└── public/             # Static files (HTML, CSS, JS)
```

## Testing Lokal

Sebelum deploy, test dulu secara lokal:

```bash
# Install dependencies
npm install

# Set environment variables di .env file
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" > .env
echo "DATABASE_URL=your_database_url_here" >> .env

# Run server
npm start
```

Server akan berjalan di `http://localhost:5000`

## Troubleshooting

### Error: JWT_SECRET not set

Pastikan environment variable `JWT_SECRET` sudah ditambahkan di Vercel Project Settings.

### Error: Database connection failed

Pastikan `DATABASE_URL` benar dan database dapat diakses dari Vercel servers (check whitelist IP jika perlu).

### Error: 404 Not Found

Pastikan semua routes sudah terdaftar dengan benar di folder `routes/` dan file `server.js`.

### Error: Function timeout

Jika request membutuhkan waktu >30 detik, upgrade Vercel plan atau optimize code Anda.

## Production Checklist

Sebelum deploy ke production, pastikan:

- [ ] Environment variables sudah diset dengan benar
- [ ] Database sudah siap dan accessible
- [ ] JWT_SECRET menggunakan string random yang aman (minimal 64 karakter)
- [ ] CORS settings sesuai kebutuhan
- [ ] Error handling sudah proper
- [ ] Sensitive data tidak ter-commit ke Git
- [ ] Testing sudah dilakukan

## Support

Untuk pertanyaan lebih lanjut tentang Vercel deployment:
- [Vercel Express Documentation](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Community](https://vercel.com/community)

## Perubahan dari Replit

Project ini sudah disesuaikan untuk Vercel deployment dengan menghapus:
- ❌ GitHub OAuth (passport-github2) - Button login GitHub dihapus dari UI
- ❌ File watcher untuk hot-reload di production (masih ada di local dev)
- ❌ Replit-specific configurations
- ❌ Field `githubId` dari User model (tidak digunakan)
- ❌ File duplikat dan assets yang tidak diperlukan

Fitur yang dipertahankan:
- ✅ Authentication via email/password dengan JWT
- ✅ Role-based access control (user, vip, admin)
- ✅ VIP endpoint protection
- ✅ Auto-loading routes dari folder `routes/`
- ✅ Dual database support (primary + endpoint database)
- ✅ Server-Sent Events (SSE) untuk real-time updates
- ✅ Admin panel untuk endpoint management

## Perbedaan Local vs Vercel

### Local Development (`server.js`)
- Menggunakan file watcher (chokidar) untuk hot-reload
- Listen di port 5000 (default)
- Console logging dengan chalk colors
- Cocok untuk development dan testing

### Vercel Production (`api/index.js`)
- Serverless function handler
- No file watcher (tidak diperlukan)
- Auto-initialization pada cold start
- Optimized untuk production deployment
- Function timeout: 60 detik (configurable)

## Tips Deployment

### 1. Environment Variables

Pastikan semua environment variables sudah diset di Vercel Dashboard:

**Required:**
- `JWT_SECRET` - untuk JWT token signing (min 64 karakter)
- `DATABASE_URL` - PostgreSQL connection string

**Recommended:**
- `NODE_ENV` - set ke `production`
- `ADMIN_WHATSAPP_NUMBER` - untuk notifikasi admin (optional)

### 2. Database Migration

Jika Anda menggunakan database baru, pastikan untuk:
1. Setup database terlebih dahulu (Vercel Postgres / Neon / Supabase)
2. Jalankan migration manual jika diperlukan
3. Database tables akan auto-created via Sequelize sync

### 3. Testing Deployment

Setelah deploy, test endpoints berikut:
- `GET /health` - health check
- `GET /api/version` - version info
- `GET /api/docs` - list semua endpoints
- `POST /auth/signup` - create account
- `POST /auth/login` - login

### 4. Common Issues

**Cold Start:**
Serverless functions memiliki cold start time. First request mungkin lambat (2-5 detik), tapi subsequent requests akan cepat.

**Database Connection:**
Pastikan DATABASE_URL benar dan database dapat diakses dari Vercel. Check IP whitelist jika menggunakan database external.

**Missing Routes:**
Jika beberapa routes tidak muncul, check apakah file route sudah export `default router` dan `metadata` dengan benar.
