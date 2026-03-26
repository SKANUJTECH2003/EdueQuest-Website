# CHANGELOG

## 2.0.0 (2026-03-26)
- Replaced legacy markdown docs with unified structured docs:
  - `ARCHITECTURE.md`
  - `API_REFERENCE.md`
  - `DATA_MODEL.md`
  - `FRONTEND_STRUCTURE.md`
  - `GAMES_STRUCTURE.md`
- Added request/response code examples to `API_REFERENCE.md`
- Added QuickStart API cURL examples for student and teacher flows
- Added `SECURITY.md` guidance (JWT/HTTPS/CORS/passwords/data retention)
- Preserved existing server and frontend logic

## 1.0.0 (initial project baseline)
- Core EduQuest features implemented:
  - User auth (signup/login)
  - Teacher portal + student roster management
  - Game-based scoring + leaderboard
  - Teacher assignments + class stats
  - Rewards redemption system
  - Offline caching via service worker
