# EduQuest Platform Documentation

## Overview
EduQuest is an open-source educational gamification platform for K-5 students, teacher class management, interactive games, quizzes, progress tracking, leaderboards, and reward redemption.

## Goals
- Support student and teacher workflows
- Gamified learning with 2D/3D games
- Secure JWT auth and role-based access
- Statistics, assignments, score history, and rewards
- Offline-first support via service worker

## Quick Start
1. `npm install`
2. Create a `.env`:
   - `PORT=3000`
   - `DB_URI=mongodb://localhost:27017/eduquest`
   - `JWT_SECRET=<secret>`
   - `NODE_ENV=development`
3. `npm start`
4. Visit `http://localhost:3000`

## Core files
- `server.js` - API server
- `auth.js` - frontend JWT and API helper
- `gameframework.js` - shared game behavior and score updates
- `sw.js` - service worker offline caching + sync
- `games/GAME_MAP.json` - dynamic game registry
- `subjects.html` - load games by class/subject

## This documentation set
- `ARCHITECTURE.md` (system architecture)
- `API_REFERENCE.md` (endpoints)
- `DATA_MODEL.md` (MongoDB schemas)
- `FRONTEND_STRUCTURE.md` (UI & UX flow)
- `GAMES_STRUCTURE.md` (game lifecycle and integration)
