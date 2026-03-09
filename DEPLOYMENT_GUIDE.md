# 🚀 PesaPilot - cPanel Deployment Guide
# Mwongozo wa Kuweka PesaPilot Kwenye cPanel

---

## 📋 HATUA 1: Andaa Files za Production (Kwenye Computer Yako)

### 1.1 Build Frontend
Fungua terminal kwenye folder ya PesaPilot na run:

```bash
cd frontend
npm run build
```

Hii itatengeneza folder ya `frontend/dist` yenye files za production.

### 1.2 Andaa Project kwa Upload
Tengeneza folder mpya na weka files hizi tu:

```
PesaPilot/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── database/
│   ├── server.js
│   ├── package.json
│   └── .env  (USIWEKE - utaweka server)
├── frontend/
│   └── dist/   (yenye files zilizo-build)
└── package.json (create new - tazama chini)
```

### 1.3 Tengeneza Root package.json
Tengeneza file `package.json` kwenye root folder:

```json
{
  "name": "pesapilot",
  "version": "1.0.0",
  "description": "PesaPilot - African Finance Tracker",
  "main": "backend/server.js",
  "scripts": {
    "start": "node backend/server.js",
    "postinstall": "cd backend && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 📋 HATUA 2: Tengeneza Database Kwenye cPanel

### 2.1 Nenda cPanel → MySQL® Databases

### 2.2 Tengeneza Database
- Database name: `pesapilot` (itakuwa: `yourusername_pesapilot`)
- Click: Create Database

### 2.3 Tengeneza User
- Username: `pesapilot` (itakuwa: `yourusername_pesapilot`)
- Password: Tumia strong password
- Click: Create User

### 2.4 Connect User na Database
- Chagua user na database uliyotengeneza
- Privileges: ALL PRIVILEGES
- Click: Add/Make Changes

### 2.5 Import Database Schema
1. Nenda: cPanel → phpMyAdmin
2. Chagua database yako
3. Click: Import
4. Upload file: `backend/database/schema.sql`
5. Kisha upload: `backend/database/migration_v2.sql`

---

## 📋 HATUA 3: Upload Files Kwenye Server

### 3.1 Nenda cPanel → File Manager

### 3.2 Pakia Files
1. Nenda folder ya domain yako (e.g., `public_html` au `pesapilot.yourdomain.com`)
2. Upload project yako (zipped, kisha extract)

Muundo unapaswa kuwa:
```
public_html/  (au subdomain folder)
├── backend/
├── frontend/
└── package.json
```

---

## 📋 HATUA 4: Setup Node.js App Kwenye cPanel

### 4.1 Nenda: cPanel → Setup Node.js App

### 4.2 Click: CREATE APPLICATION

### 4.3 Fill Settings:
| Setting | Value |
|---------|-------|
| Node.js version | 18.x au juu |
| Application mode | Production |
| Application root | `pesapilot` (folder yako) |
| Application URL | `yourdomain.com` au `pesapilot.yourdomain.com` |
| Application startup file | `backend/server.js` |

### 4.4 Click: CREATE

### 4.5 Copy the "Source" command
Utaona command kama:
```
source /home/username/nodevenv/pesapilot/18/bin/activate
```
Hii utaihitaji baadaye.

---

## 📋 HATUA 5: Setup Environment Variables

### 5.1 Kwenye Node.js App page, click: "Environment variables"

### 5.2 Add these variables:
| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DB_HOST` | `localhost` |
| `DB_USER` | `yourusername_pesapilot` |
| `DB_PASSWORD` | `your_database_password` |
| `DB_NAME` | `yourusername_pesapilot` |
| `JWT_SECRET` | `some_very_long_random_string_at_least_32_chars` |
| `JWT_EXPIRES_IN` | `7d` |

### 5.3 Click: SAVE

---

## 📋 HATUA 6: Install Dependencies & Start

### 6.1 Nenda: cPanel → Terminal
(Au tumia Node.js App page → "Run NPM Install")

### 6.2 Run Commands:
```bash
# Activate Node environment
source /home/username/nodevenv/pesapilot/18/bin/activate

# Nenda project folder
cd pesapilot

# Install backend dependencies
cd backend
npm install

# Back to root
cd ..
```

### 6.3 Start Application
Kwenye Node.js App page, click: **START APPLICATION**

---

## 📋 HATUA 7: Test Your App

### 7.1 Open browser na nenda:
```
https://yourdomain.com
```
au
```
https://pesapilot.yourdomain.com
```

### 7.2 Check API:
```
https://yourdomain.com/api/health
```
Unapaswa kuona: `{"status":"ok","message":"PesaPilot API is running"}`

---

## 🔧 TROUBLESHOOTING (Matatizo na Suluhisho)

### ❌ "Application Error" au Blank Page
1. Check Node.js App logs kwenye cPanel
2. Hakikisha `NODE_ENV=production` imewekwa
3. Hakikisha `frontend/dist` folder ipo

### ❌ Database Connection Error
1. Hakikisha DB credentials ziko sahihi
2. Hakikisha user amepewa ALL PRIVILEGES
3. Check DB_HOST = `localhost` (si IP address)

### ❌ 404 on page refresh
1. Hii ni React routing issue
2. Hakikisha server.js ina static file serving code

### ❌ API not working
1. Test: `yourdomain.com/api/health`
2. Check CORS settings
3. Check environment variables

---

## 📞 SUPPORT

Ukihitaji msaada:
1. Check error logs kwenye cPanel → Error Log
2. Check Node.js App logs
3. Wasiliana na hosting support

---

## 🎉 HONGERA!

PesaPilot yako sasa iko LIVE! 🚀

Enjoy managing your finances! 💰
