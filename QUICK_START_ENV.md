# ⚡ Quick Start - Environment Setup

## 🚀 Backend .env File Setup

The `.env` file has been created in `backend/` directory with secure keys.

### ✅ What's Already Done:
- ✅ `.env` file created with secure encryption keys
- ✅ Secure session secret generated
- ✅ Default configuration set for development

### 📝 What You Need to Add:

#### 1. GitHub OAuth Credentials (Optional but Recommended)

After creating your GitHub OAuth app (see `GITHUB_OAUTH_SETUP.md`), add to `backend/.env`:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

**GitHub OAuth App Settings:**
- **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
- **Scopes**: `user:email`, `repo`, `read:org`

---

## 🔗 GitHub OAuth App Creation (Quick Steps)

1. **Go to**: https://github.com/settings/developers
2. **Click**: "New OAuth App"
3. **Fill in**:
   - **Name**: `RepoResume`
   - **Homepage**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:3001/api/auth/github/callback` ⚠️ **Must match exactly!**
4. **Copy** Client ID and generate Client Secret
5. **Add to** `backend/.env` file

---

## 📋 Current .env File Location

```
backend/.env
```

**Contains**:
- ✅ `ENCRYPTION_KEY` (64-character secure key)
- ✅ `SESSION_SECRET` (64-character secure key)
- ✅ `NODE_ENV=development`
- ✅ `PORT=3001`
- ✅ `DATABASE_URL=sqlite:./database.sqlite`
- ⏳ `GITHUB_CLIENT_ID=` (add your value)
- ⏳ `GITHUB_CLIENT_SECRET=` (add your value)

---

## 🎯 Next Steps

1. **Create GitHub OAuth App** (see `GITHUB_OAUTH_SETUP.md`)
2. **Add credentials** to `backend/.env`
3. **Restart backend** server
4. **Test login** at `http://localhost:3001/api/auth/github`

---

## ⚠️ Important Notes

- **Never commit** `.env` file to git (already in `.gitignore`)
- **Generate new keys** for production deployment
- **Keep secrets secure** - don't share them publicly
- **CORS is fixed** - desktop app should work now!

---

**Full Guide**: See `GITHUB_OAUTH_SETUP.md` for detailed instructions

