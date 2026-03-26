# EduQuest Architecture

## 1. High-level components
- Backend: `server.js` using Express + Mongoose + JWT
- Frontend: static HTML pages + vanilla JS + localStorage
- Data store: MongoDB
- Offline: `sw.js` service worker + cache strategies
- Game SDK: `games/gameframework.js`

## 2. Layers
1. Presentation (UI pages)
2. Client logic (`auth.js`, `progress-tracker.js`, ...)
3. API (Express routes)
4. Data models (Mongoose schemas)
5. Persistence (MongoDB)

## 3. User types
- Student (role=user)
- Teacher (role=teacher)
- Admin (role=admin)

## 4. Authentication flow
- Sign-up/login POST endpoints issue JWT (7d expiry)
- Frontend stores token in localStorage
- Protected routes use `Authorization: Bearer <token>`
- Middleware `authenticateToken` on API

## 5. Essential capabilities
- `signup`, `login`, `teacher/signup`, `teacher/login`, `social-auth`
- Teacher class/student management
- Assignments and class stats
- Game sessions and score updates
- Peer leaderboard and recommendation rules
- Reward catalog and redemption log
- Notifications and quiz suggestion

## 6. Key files mapping
- `index.html` / `login.html` / `dashboard.html` / ... (UI pages)
- `auth.js`: API wrappers and session utilities
- `assignment-manager.js`: assignment CRUD interaction
- `student-manager.js`: student roster and GDPR
- `progress-tracker.js`: progress + charting
- `games/gameframework.js`: game host interface
- `GAMES_STRUCTURE_GUIDE.md` replaced by this doc set

## 7. Deployment
- `npm start` runs `node server.js`
- Requires MongoDB running at `DB_URI`
- Serves static files from project root with `express.static(__dirname)`

## 8. Extensibility points
- Add new API path with role check middleware
- Add new game under `games/classX` and register in `games/GAME_MAP.json`
- Add new UI page and route to `index.html`/menu
- Add schema + UI for features (e.g., chat, reports)
