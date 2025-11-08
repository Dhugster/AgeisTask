# 🔐 GitHub OAuth Application Setup Guide

## Step-by-Step Instructions

### 1. Create GitHub OAuth App

1. **Go to GitHub Settings**:
   - Visit: https://github.com/settings/developers
   - Or: GitHub → Settings → Developer settings → OAuth Apps

2. **Click "New OAuth App"**

3. **Fill in Application Details**:

   **Application name**: `RepoResume` (or your preferred name)
   
   **Homepage URL**: 
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
   
   **Authorization callback URL** (CRITICAL - Must match exactly):
   ```
   http://localhost:3001/api/auth/github/callback
   ```
   
   ⚠️ **Important**: This must match exactly what's in your `.env` file!

4. **Click "Register application"**

5. **Copy Your Credentials**:
   - **Client ID**: Copy this (public, safe to share)
   - **Client Secret**: Click "Generate a new client secret" and copy it immediately
     - ⚠️ You can only see the secret once!

---

## 2. Configure Your Backend

### Add to `backend/.env`:

```bash
# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
```

### Example:
```bash
GITHUB_CLIENT_ID=Iv1.8a61f9b3a7aba766
GITHUB_CLIENT_SECRET=0123456789abcdef0123456789abcdef01234567
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
```

---

## 3. Redirect URLs for Different Environments

### Development (Local)
```
Authorization callback URL: http://localhost:3001/api/auth/github/callback
```

### Production (Web App)
```
Authorization callback URL: https://yourdomain.com/api/auth/github/callback
```

### Desktop App (Tauri)
```
Authorization callback URL: http://localhost:3001/api/auth/github/callback
```
*Note: Desktop app uses localhost backend, so same as development*

---

## 4. Multiple Environments Setup

If you need multiple OAuth apps (dev, staging, production):

### Option A: Separate OAuth Apps (Recommended)
Create separate OAuth apps for each environment:
- **Development**: `http://localhost:3001/api/auth/github/callback`
- **Staging**: `https://staging.yourdomain.com/api/auth/github/callback`
- **Production**: `https://yourdomain.com/api/auth/github/callback`

### Option B: Single OAuth App with Multiple Callbacks
GitHub allows multiple callback URLs per OAuth app:
1. Edit your OAuth app
2. Add multiple callback URLs (one per line):
   ```
   http://localhost:3001/api/auth/github/callback
   https://staging.yourdomain.com/api/auth/github/callback
   https://yourdomain.com/api/auth/github/callback
   ```

---

## 5. OAuth Scopes Required

The app requests these scopes (configured in `backend/src/config/passport.js`):
- `user:email` - Access user email addresses
- `repo` - Full control of private repositories
- `read:org` - Read org and team membership

**Minimum Required**:
- `user:email` - For user identification
- `public_repo` - For public repositories (if you want to reduce permissions)

**For Private Repos**:
- `repo` - Required to access private repositories

---

## 6. Security Best Practices

### ✅ Do:
- ✅ Use different OAuth apps for dev/production
- ✅ Rotate client secrets regularly
- ✅ Store secrets in environment variables (never commit)
- ✅ Use HTTPS in production
- ✅ Limit OAuth app permissions to minimum required

### ❌ Don't:
- ❌ Commit `.env` file to git
- ❌ Share client secrets publicly
- ❌ Use production credentials in development
- ❌ Grant unnecessary scopes

---

## 7. Testing Your Setup

### Test OAuth Flow:

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Check Logs**:
   - Should see: `GitHub OAuth configured` (not the warning)

3. **Test Login**:
   - Visit: `http://localhost:3001/api/auth/github`
   - Should redirect to GitHub
   - After authorization, should redirect back to frontend

4. **Verify Callback**:
   - Check backend logs for successful authentication
   - Check database for new user record

---

## 8. Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem**: Callback URL doesn't match GitHub OAuth app settings

**Solution**:
1. Check `GITHUB_CALLBACK_URL` in `.env` matches GitHub settings
2. Must match exactly (including `http://` vs `https://`)
3. No trailing slashes

### Error: "invalid_client"
**Problem**: Client ID or Secret incorrect

**Solution**:
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
2. Check for extra spaces or quotes
3. Regenerate client secret if needed

### Error: "access_denied"
**Problem**: User denied authorization

**Solution**: Normal - user chose not to authorize. Try again.

### CORS Errors
**Problem**: `https://tauri.localhost not allowed`

**Solution**: Already fixed! The backend now allows Tauri origins.

---

## 9. Quick Setup Checklist

- [ ] Created GitHub OAuth App
- [ ] Set callback URL: `http://localhost:3001/api/auth/github/callback`
- [ ] Copied Client ID
- [ ] Generated and copied Client Secret
- [ ] Added credentials to `backend/.env`
- [ ] Restarted backend server
- [ ] Tested login flow
- [ ] Verified user creation in database

---

## 10. Production Deployment

When deploying to production:

1. **Create Production OAuth App**:
   - Use production domain for homepage
   - Set callback URL to: `https://yourdomain.com/api/auth/github/callback`

2. **Update Environment Variables**:
   ```bash
   GITHUB_CLIENT_ID=production_client_id
   GITHUB_CLIENT_SECRET=production_client_secret
   GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Enable HTTPS**:
   ```bash
   FORCE_HTTPS=true
   ```

4. **Update CORS**:
   - Add production frontend URL to allowed origins

---

## 📝 Example `.env` File

```bash
# Required Security Keys
ENCRYPTION_KEY=586abd22c0f03a41e39a08c0e492e53f974601f4a5c1fa848c24a94ffd736403
SESSION_SECRET=f7aca921b203e1f62bd12cc574ef330fbf05a1c3a88171f56c648a56a6e0396f

# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=sqlite:./database.sqlite

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id_from_github
GITHUB_CLIENT_SECRET=your_client_secret_from_github
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
```

---

**Need Help?** Check the logs for specific error messages!

