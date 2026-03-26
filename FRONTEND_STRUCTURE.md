# Frontend Structure

## Pages
- `index.html`: initial login/landing, redirects to login/dashboard
- `login.html`: auth form, calls /api/login and /api/teacher/login
- `dashboard.html`: user dashboard, score, navigation
- `teacher-dashboard.html`: teacher overview
- `subjects.html`: game portal, class/subject game list dynamic
- `study_material.html`: content library
- `leaderboard.html`: top players
- `redeem.html`: reward store
- `game-results.html`: after game completion
- `parent-auth.html`, `teacher-auth.html`, etc.

## Key scripts
- `auth.js`: session + API helper wrappers, auth guards
- `assignment-manager.js`: teacher assignment CRUD forms
- `student-manager.js`: teacher student roster + GDPR auditing
- `progress-tracker.js`: game progress, chart.js callouts
- `games/gameframework.js`: game interface, updateScoreOnServer
- `sw.js`: offline support with cache and API stale-while-revalidate

## UI data flow
1. authenticate -> store JWT + user profile in localStorage
2. site pages call `requireAuth` and get token from localStorage
3. `apiRequest` adds Authorization header automatically
4. Game results saved in localStorage + posted to `/api/update-score` or `/api/me/game-sessions`
5. Leaderboard + stats fetch from server
6. Teacher actions call teacher APIs
7. Rewards call `/api/redeem-product`

## Game integration (subjects-related)
- Game map loaded from `games/GAME_MAP.json`
- Each game page sets localStorage flags (`gameCompleted`, `completedGameId`, `gameScore`)
- `subjects.html` checks game completion and updates server

## Offline behavior
- `sw.js` caches specific pages and external assets
- Stale-while-revalidate for `/api/` resources and fallback to cached offline data
- Push sync events for scores/redemptions via background sync

## Local caches & privacy
- `StudentManager` uses localStorage for teacher/student roster for quick UI updates
- `PrivacyManager` (linked in code) logs events to support audit trail
- Remove sensitive data on logout

## Accessibility and UX notes
- Responsive card-based layout for classes/subjects
- clear scoreboard and progress actions
- role-based navigation (student, teacher, admin)
