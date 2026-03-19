# Games Structure Guide - EduQuest

## 📋 Overview

The `subjects.html` has been **cleaned and simplified**. All hardcoded game entries have been removed. Games are now loaded dynamically from `games/GAME_MAP.json`.

---

## 🎮 How to Add Your Custom Games

### Step 1: Prepare Your Game Files

Create your 2D/3D game HTML files and place them in the appropriate folder:

```
games/
├── class1/
│   ├── english/
│   │   └── your-game.html
│   ├── maths/
│   ├── evs/
│   └── hindi/
├── class2/
├── class3/
├── class4/
├── class5/
└── GAME_MAP.json
```

### Step 2: Update `games/GAME_MAP.json`

Add your game entries to `GAME_MAP.json` with this structure:

```json
{
  "gameMapping": {
    "class1": {
      "english": [
        {
          "id": "unique-game-id",
          "name": "Your Game Title",
          "desc": "Short description of the game",
          "type": "2D or 3D",
          "tech": "Canvas, Three.js, Babylon.js, etc.",
          "file": "class1/english/your-game.html"
        }
      ],
      "maths": [...],
      "evs": [...],
      "hindi": [...]
    },
    "class2": {...},
    "class3": {...},
    "class4": {...},
    "class5": {...}
  }
}
```

### Step 3: Game File Requirements

Your game HTML file should:

1. **Must set completion flags when game ends:**
   ```javascript
   // When player completes the game
   localStorage.setItem('gameCompleted', 'true');
   localStorage.setItem('completedGameName', 'Your Game Name');
   localStorage.setItem('completedGameId', 'unique-game-id'); // Must match GAME_MAP id
   localStorage.setItem('gameScore', 100); // Points earned
   
   // Redirect back to subjects page
   window.location.href = 'subjects.html';
   ```

2. **Recommended structure:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Your Game Name</title>
       <style>
           /* Your game styles */
       </style>
   </head>
   <body>
       <!-- Your game container -->
       <script>
           // Your game logic
           
           // When game is complete:
           function endGame(score) {
               localStorage.setItem('gameCompleted', 'true');
               localStorage.setItem('completedGameName', 'Game Name');
               localStorage.setItem('completedGameId', 'game-id');
               localStorage.setItem('gameScore', score);
               window.location.href = 'subjects.html';
           }
       </script>
   </body>
   </html>
   ```

---

## 📌 Examples

### Adding a Maths Game for Class 2

**File:** `games/class2/maths/number-addition.html`

**GAME_MAP.json entry:**
```json
"maths": [
  {
    "id": "c2m1",
    "name": "Number Addition Quest",
    "desc": "Add numbers up to 50",
    "type": "2D",
    "tech": "Canvas",
    "file": "class2/maths/number-addition.html"
  }
]
```

### Adding a 3D Science Game for Class 4

**File:** `games/class4/science/solar-system-3d.html`

**GAME_MAP.json entry:**
```json
"science": [
  {
    "id": "c4s1",
    "name": "Solar System Explorer 3D",
    "desc": "Explore planets in 3D space",
    "type": "3D",
    "tech": "Babylon.js",
    "file": "class4/science/solar-system-3d.html"
  }
]
```

---

## 🔄 Game Completion Flow

1. **User clicks "Play" button** on subjects.html
2. **Game loads** from GAME_MAP.json entry
3. **Player completes game** and scores points
4. **Game sets localStorage flags:**
   - `gameCompleted = true`
   - `completedGameId = game-id`
   - `completedGameName = game-name`
   - `gameScore = points`
5. **Redirects to subjects.html**
6. **subjects.html detects completion** and:
   - Updates user score on server
   - Logs completion in database
   - Shows "Done!" badge on that game card
7. **Player can play again** anytime

---

## 📝 Class Subject Mapping

```
Class 1:
- English
- Maths
- EVS (Environmental Studies)
- Hindi

Class 2:
- English
- Mathematics
- EVS
- Hindi

Class 3/4/5:
- English
- Mathematics
- Science
- Social Studies
- Hindi
```

---

## 🎯 Tips for Game Development

1. **Keep file paths relative** - Always use paths relative to `games/` folder
2. **Use unique game IDs** - Format: `c{class}{subject-initial}{number}` (e.g., `c1e1`, `c3m5`)
3. **Test locally first** - Make sure game works before adding to GAME_MAP.json
4. **Set score appropriately** - Points should reflect difficulty
5. **Add game difficulty description** - Let "type" field (2D/3D) help players know what to expect

---

## ✅ Completed Structure Check

Your subjects.html is now:
- ✅ Clean with no hardcoded games
- ✅ Ready to load from GAME_MAP.json
- ✅ Supports score tracking
- ✅ Supports 2D and 3D games
- ✅ Ready for individual game additions

---

## 🚀 Next Steps

1. Create your game files (2D/3D)
2. Update `games/GAME_MAP.json` with entries
3. Test by selecting a class and subject
4. See your games appear! 🎮

---

**Happy Game Development! 🎉**
