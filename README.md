# EduQuest (Educational Gamification Platform)

> Owned and maintained by Anuj (not for unauthorized copying or misuse).

## 🚀 Live Deployment

- Deployed app: https://eduquest-anuj.netlify.app/

## 🎯 Project Overview

EduQuest is a full-featured educational gamification platform.

- Class management (teachers, students)
- Quizzes, games, leaderboards
- Student progress tracking and rewards
- JWT-based authentication
- MongoDB database


## 🛠️ Prerequisites

- Node.js v16+ (or higher)
- npm (bundled with Node.js)
- MongoDB (local or remote)


## 📦 Dependencies

From `package.json`:
- bcryptjs
- body-parser
- compression
- cors
- dotenv
- express
- joi
- jsonwebtoken
- mongoose


## ⚙️ Main Files and Directories

- `index.html` - landing/login page
- `server.js` - Express server and API
- `package.json` - scripts, dependencies, metadata
- `sw.js` - service worker (offline support)
- `manifest.json` - PWA metadata
- `games/` - learning games
- `books/` - content library


## 📘 Environment Configuration

Create a `.env` file at project root (if absent) and add:

```
PORT=3000
DB_URI=mongodb://localhost:27017/eduquest
JWT_SECRET=your_jwt_secret_key_change_in_production
NODE_ENV=development
```


## ▶️ Run Locally

Open terminal in project folder and run:

1. `npm install`
2. `npm start`

Then visit:

- `http://localhost:3000`


## 🧩 API Endpoints

### Public / General
- `GET /` - loads index and static files

### Teacher / Student
- `GET /api/teacher/me` (requires JWT)
- `POST /api/teacher/students/add` (requires JWT + JSON)
- `DELETE /api/teacher/students/:email` (requires JWT)
- `GET /api/teacher/classes/:id` (requires JWT)
- `PATCH /api/teacher/students/:email` (requires JWT)

Check `server.js` for the full set of routes and business logic.


## 🔐 Authentication

- Uses JWT tokens (Authorization header: `Bearer <token>`)
- Keep `JWT_SECRET` safe in `.env` for production


## 🧪 Testing

- No unit tests are included at this time.
- `npm test` currently prints an error placeholder.


## 📚 Quickstart (Clone + Run)

1. `git clone <repo-url>`
2. `cd "EdueQuest Website"`
3. `npm install`
4. Create/update `.env`
5. `npm start`


## 💡 Troubleshooting

- MongoDB not connected? verify `DB_URI`, ensure MongoDB is running.
- Port conflict? set a different `PORT` in `.env`.
- JWT or user problems? verify request payload and authentication flow.


## 📌 Customization

- Add more games under `games/classX/...`
- Add more content under `books/`
- Extend server APIs in `server.js`


## 🤝 Contributing

1. Create a new branch
2. Make changes
3. `git add . && git commit -m "feat: ..."`
4. `git push origin <branch>`
5. Open a pull request


## 📝 License

- ISC (`package.json` indicates ISC)


## 🗂️ Additional Notes

- The service worker in `sw.js` handles offline caching.
- `manifest.json` contains PWA metadata.


## 🔐 License & Security Notice

- Project author: **Anuj**.
- License: **ISC** (as defined in `package.json`), with explicit prohibition on unauthorized copying or redistribution without consent.
- Security policy: use only with valid login accounts and configured DB credentials; do not expose `JWT_SECRET` or database credentials publicly.

---

This README is now fully in English. If you want a shorter one-page quickstart section with examples of API requests (curl/Postman), I can add it next.