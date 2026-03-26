# Games Structure Guide

## Purpose
EduQuest game system is extensible by class and subject. Controls within `subjects.html` are driven by `games/GAME_MAP.json`.

## GAME_MAP.json format
```
{
  "gameMapping": {
    "class1": {
      "english": [{"id":"","name":"","desc":"","type":"2D","tech":"","file":"class1/english/..html"}],
      "maths": [...],
      "evs": [...],
      "hindi": [...]
    },
    "class2": {...}
  }
}
```

## Game page contract
When a game is completed in the game HTML:
- `localStorage.setItem('gameCompleted','true')`
- `localStorage.setItem('completedGameId','<id>')`
- `localStorage.setItem('completedGameName','<name>')`
- `localStorage.setItem('gameScore', '<score>')`
- redirect to `subjects.html`

`subjects.html` reads these flags and:
- Posts score to `/api/update-score` or `/api/me/game-sessions`
- Updates UI badges
- Resets completion flags

## GameManager (gameframework.js)
- `init()` checks token
- `addPoints()` local score
- `updateScoreOnServer()` POSTs to `/api/update-score`
- `showCompletionPopup()` UI

## Adding a new game
1. Add game file in `games/classX/subject/your-game.html`
2. Register entry in `games/GAME_MAP.json`
3. Implement completion hug contract
4. Test in browser

## Shipped examples
- `games/class1/english/c1e1-*` etc
- 2048: `games/2048-master/index.html` (third-party)

## Notes
- UI and metadata in `subjects.html` is dynamic.
- `GameSession` records in Mongo for analytics.
- `gameScore` may be used for subject points increment in `update-score`.
