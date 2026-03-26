# DEPLOYMENT.md 

## Goal
Deploy EduQuest fullstack app online for free, including backend (`server.js`) and MongoDB database.

## Recommended Free Hosting Stack
1. MongoDB Atlas (free tier)
2. Railway or Render (free tier) for Node.js
3. GitHub for source repository (if not already)

---

## Step 0: Prep
- `git init` (if needed)
- commit project
- create GitHub repository

## Step 1: MongoDB Atlas setup
1. Create Atlas account (https://www.mongodb.com/cloud/atlas).
2. Create a free cluster (M0).
3. In Network Access, allow IP `0.0.0.0/0` (or narrow to your machine/hosting CIDR).
4. Create database user (readWrite) with password.
5. Copy connection string, e.g.:
    `mongodb+srv://<user>:<password>@cluster0.xxxxxx.mongodb.net/eduquest?retryWrites=true&w=majority`

## Step 2: Setup with Railway (best quick path)
1. Sign in https://railway.app using GitHub.
2. Create new project -> "Deploy from GitHub Repo".
3. Connect to EduQuest repo.
4. Choose `package.json` and start command `npm start`.
5. Set env vars:
   - `PORT` -> `3000` (or leaving blank if auto)
   - `DB_URI` -> MongoDB Atlas URI
   - `JWT_SECRET` -> secure random string
   - `NODE_ENV` -> `production`
6. Railway deploys automatically.
7. Confirm deployed endpoint URL. e.g. `https://eduquest-xxxx.up.railway.app`.

## Step 3: Setup on Render (alternative)
1. Sign in https://render.com (with GitHub).
2. New -> Web Service -> connect repo.
3. Branch `main`, runtime `Node`, build command `npm install`, start `npm start`.
4. Add env vars same as above.
5. Set `ROOT` to project route if needed.
6. Trigger deploy.

## Step 4: Configure client URLs and public base
- In `manifest.json` or PWA if needed, set host to deployed URL.

## Step 5: Check / admin/test
- Visit `/` deployed URL
- `curl https://<deployed>/api/health` (if endpoint exists) or /guardian user route.

---

## Optional: Build separate static site + API
- Static pages can also be served by Vercel (free) if you split, but current app includes both backend and frontend in one Express layer.

## Optional: Add SSL and domain
- Railway/Render provide HTTPS automatically.
- Optional custom domain in service provider settings.

---

## Quick manual test commands
```bash
# 1. Create repo / push
git add .
git commit -m "deployable"
git push origin main

# 2. Set local debug
export DB_URI="mongodb+srv://..."
export JWT_SECRET="SOME_SECRET"
npm install
npm start
```

---

## Post-deploy checklist
- Validate session flows
- Verify teacher endpoints require JWT.
- Perform signup+login and play game to confirm DB persistence.
- Monitor logs in Railway/Render.

---

## Notes for free tier
- MongoDB Atlas free has 512MB and 100+ max connections.
- Railway free has auto-sleep after inactivity; use wake URL.
- Render free has 750h/month, same sleep behavior.
- `0.0.0.0/0` IP access is convenient but make production tighter.
