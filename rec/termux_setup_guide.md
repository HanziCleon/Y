# 🐺 Werewolf Chat Game - Setup Termux & Cara Main

## 📱 SETUP DI TERMUX (Lengkap!)

### 1️⃣ Install Termux Packages
```bash
# Update package list
pkg update && pkg upgrade -y

# Install Node.js dan Git
pkg install nodejs git -y

# Cek versi (pastikan Node.js terinstall)
node -v
npm -v
```

### 2️⃣ Setup Project
```bash
# Buat folder project
mkdir werewolf-game
cd werewolf-game

# Clone atau buat struktur folder
mkdir -p src
touch package.json vite.config.js tailwind.config.js postcss.config.js index.html
touch src/main.jsx src/App.jsx src/index.css
```

### 3️⃣ Setup JSONBin (Database Cloud Gratis!)
1. Buka browser, ke: **https://jsonbin.io/**
2. **Sign Up** (bisa pakai email atau Google)
3. Klik **"Create Bin"**
4. Isi dengan data awal ini:
```json
{
  "messages": [],
  "gameState": {
    "players": [],
    "phase": "lobby",
    "roles": {},
    "votes": {},
    "deaths": [],
    "day": 0
  }
}
```
5. Klik **"Create"**
6. **COPY** dua hal ini:
   - **BIN ID** (contoh: 6501234abcd5678)
   - **X-Master-Key** (contoh: $2b$10$abc123...)

### 4️⃣ Copy File Content
Salin semua file dari artifact yang sudah saya buat:
- `package.json` → copy ke file package.json
- `vite.config.js` → copy ke file vite.config.js
- `tailwind.config.js` → copy ke file tailwind.config.js
- `postcss.config.js` → copy ke file postcss.config.js
- `index.html` → copy ke file index.html
- `src/main.jsx` → copy ke file src/main.jsx
- `src/App.jsx` → copy dari artifact pertama
- `src/index.css` → copy ke file src/index.css

**PENTING!** Di file `src/App.jsx`, ganti baris ini:
```javascript
const JSONBIN_API_KEY = '$2b$10$YOUR_API_KEY_HERE'; // Ganti dengan X-Master-Key kamu
const BIN_ID = 'YOUR_BIN_ID_HERE'; // Ganti dengan Bin ID kamu
```

### 5️⃣ Install Dependencies
```bash
# Install semua package (tunggu 5-10 menit)
npm install

# Kalau ada error, coba:
npm install --legacy-peer-deps
```

### 6️⃣ Jalankan Development Server
```bash
# Start server
npm run dev

# Server akan jalan di:
# Local: http://localhost:3000
# Network: http://192.168.x.x:3000 (untuk akses dari HP lain)
```

### 7️⃣ Akses Website
**Dari HP yang sama (Termux):**
- Buka browser: `http://localhost:3000`

**Dari HP/Laptop lain (satu WiFi):**
1. Cek IP Termux: `ifconfig` atau `ip addr show`
2. Cari IP yang ada `wlan0` (contoh: 192.168.1.100)
3. Buka browser: `http://192.168.1.100:3000`

### 8️⃣ Tips Termux
```bash
# Kalau Termux tertutup, server mati. Gunakan ini agar tetap jalan:
termux-wake-lock

# Stop server: tekan CTRL + C

# Jalankan lagi:
npm run dev
```

---

## 🎮 CARA MAIN WEREWOLF

### 📖 PERSIAPAN
1. **Minimal 4 pemain** (lebih seru 6-12 pemain)
2. Semua pemain buka website
3. Setiap orang masukkan username
4. Owner room klik **"START GAME"**

### 🎭 ROLE (PERAN)

#### 🐺 **WEREWOLF (Serigala)**
- **TIM:** Jahat
- **TUGAS:** Membunuh warga setiap malam
- **SKILL:** Di malam hari, pilih 1 warga untuk dibunuh
- **MENANG:** Jika jumlah werewolf = jumlah warga
- **CARA MAIN:** 
  - Saat malam, klik tombol vote untuk bunuh target
  - Di chat, jangan sampai ketahuan kamu werewolf!
  - Diskusi siang hari: alibi yang kuat, tuduh orang lain

#### 🔮 **SEER (Peramal)**
- **TIM:** Baik
- **TUGAS:** Cari tahu siapa werewolf
- **SKILL:** Setiap malam, bisa lihat role 1 pemain
- **CARA MAIN:**
  - Malam: pilih pemain untuk dicek rolenya
  - Siang: beri petunjuk halus ke warga (jangan terlalu obvious!)
  - HATI-HATI: Kalau werewolf tahu kamu Seer, kamu target utama!

#### 🛡️ **GUARD (Penjaga)**
- **TIM:** Baik
- **TUGAS:** Lindungi warga dari serangan werewolf
- **SKILL:** Setiap malam, pilih 1 pemain untuk dilindungi
- **CARA MAIN:**
  - Malam: pilih siapa yang dilindungi (bisa diri sendiri)
  - Kalau tebakan tepat, orang yang diserang werewolf tetap hidup
  - Lindungi pemain penting (Seer kalau tahu siapa)

#### 👤 **VILLAGER (Warga)**
- **TIM:** Baik
- **TUGAS:** Bantu cari werewolf lewat diskusi
- **SKILL:** Tidak punya skill khusus
- **CARA MAIN:**
  - Perhatikan perilaku setiap pemain
  - Diskusi aktif saat siang hari
  - Vote pemain yang mencurigakan

### ⏰ ALUR PERMAINAN

#### 🌙 **FASE MALAM (Night Phase)**
**Durasi:** 90 detik

1. Semua pemain akan dapat notifikasi role mereka
2. **Werewolf:** Pilih target untuk dibunuh
3. **Seer:** Pilih pemain untuk dicek rolenya
4. **Guard:** Pilih pemain untuk dilindungi
5. **Villager:** Tunggu sampai pagi

**PENTING:** Di fase ini, diskusi di chat untuk strategi tim (werewolf ngobrol sesama werewolf, warga diskusi siapa yang mencurigakan)

#### ☀️ **FASE PAGI (Day Phase)**
**Durasi:** 90 detik

1. Game akan umumkan siapa yang mati (atau tidak ada korban)
2. Kalau ada yang mati, rolenya akan diumumkan
3. **DISKUSI BEBAS:** 
   - Semua pemain ngobrol, tukar pikiran
   - Cari petunjuk siapa werewolf
   - Seer bisa kasih hint (tapi jangan terang-terangan!)
   - Werewolf harus pinter ngeles dan tuduh orang lain

#### 🗳️ **FASE VOTING**
**Durasi:** 90 detik

1. Semua pemain vote 1 orang yang dicurigai werewolf
2. Klik nama pemain di sidebar untuk vote
3. Pemain dengan vote terbanyak akan dieksekusi
4. Role pemain yang dieksekusi akan diungkap
5. Kalau vote seri → tidak ada yang mati

---

## 💡 STRATEGI & TIPS

### Untuk WEREWOLF 🐺
- ✅ Jangan bunuh orang yang sama seperti player lain curigai
- ✅ Ikut diskusi aktif, pura-pura cari werewolf
- ✅ Tuduh pemain lain dengan alasan yang masuk akal
- ✅ Bunuh Seer/Guard dulu kalau ketahuan
- ❌ Jangan terlalu agresif menuduh
- ❌ Jangan diam saja (kelihatan mencurigakan)

### Untuk SEER 🔮
- ✅ Cek pemain yang paling dicurigai dulu
- ✅ Kasih hint halus, jangan bilang "aku Seer"
- ✅ Kalau tahu siapa werewolf, koordinasi diam-diam
- ❌ Jangan langsung bilang hasil cek kamu

### Untuk GUARD 🛡️
- ✅ Lindungi diri sendiri malam pertama
- ✅ Lindungi Seer kalau tahu siapa
- ✅ Perhatikan siapa yang sering diserang werewolf

### Untuk VILLAGER 👤
- ✅ Diskusi aktif, cari pola perilaku
- ✅ Percaya pada Seer (kalau dia ngasih hint)
- ✅ Vote berdasarkan logika, bukan perasaan

---

## 🏆 KONDISI MENANG

**TIM WARGA MENANG:**
- Semua werewolf mati (dieksekusi)

**TIM WEREWOLF MENANG:**
- Jumlah werewolf = jumlah warga hidup

---

## ⚡ QUICK START (Ringkas!)

```bash
# 1. Setup Termux
pkg update && pkg install nodejs git -y

# 2. Buat project
mkdir werewolf-game && cd werewolf-game
mkdir src

# 3. Copy semua file dari artifact

# 4. Setup JSONBin di https://jsonbin.io
# Copy API Key & Bin ID ke src/App.jsx

# 5. Install & Run
npm install
npm run dev

# 6. Buka http://localhost:3000
```

**SELESAI! Game siap dimainkan! 🎉**

---

## 📝 TROUBLESHOOTING

**Port sudah dipakai?**
```bash
# Ganti port di vite.config.js, ubah port: 3000 jadi port: 8080
```

**npm install error?**
```bash
npm install --legacy-peer-deps
```

**Server lambat?**
```bash
# Ganti polling interval di App.jsx dari 3000 jadi 5000
```

**Tidak bisa akses dari HP lain?**
```bash
# Pastikan satu WiFi
# Matikan firewall HP
# Cek IP dengan: ifconfig
```