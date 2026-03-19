/**
 * PROGRESS TRACKING SYSTEM
 * Tracks student progress, completed games, scores, and performance metrics
 */

const ProgressTracker = {
    // Database structure
    userDatabase: {},
    
    /**
     * Initialize or get user profile
     */
    initializeUser(userId = 'student_' + Date.now()) {
        const storedData = localStorage.getItem('studentProgress');
        
        if (storedData) {
            this.userDatabase = JSON.parse(storedData);
        } else {
            this.userDatabase = {
                userId: userId,
                name: 'Student',
                class: '1',
                joinDate: new Date().toISOString(),
                totalScore: 0,
                totalGamesPlayed: 0,
                gameProgress: {},
                subjectProgress: {},
                dailyStats: [],
                achievements: [],
                lastActive: new Date().toISOString()
            };
            this.saveProgress();
        }

        // after loading or creating, synchronize with any legacy localStorage entries
        this.syncLegacyData();
        return this.userDatabase;
    },
    
    /**
     * Update user basic info
     */
    updateUserInfo(name, classLevel) {
        this.userDatabase.name = name;
        this.userDatabase.class = classLevel;
        this.saveProgress();
    },
    
    /**
     * Record game completion
     */
    recordGameCompletion(gameId, gameName, subject, score, maxScore = 100) {
        if (!this.userDatabase.gameProgress[gameId]) {
            this.userDatabase.gameProgress[gameId] = {
                gameId: gameId,
                gameName: gameName,
                subject: subject,
                attempts: 0,
                completions: 0,
                bestScore: 0,
                totalScore: 0,
                firstAttempt: new Date().toISOString(),
                lastAttempt: null,
                attemptHistory: []
            };
        }
        
        const gameData = this.userDatabase.gameProgress[gameId];
        gameData.attempts++;
        gameData.lastAttempt = new Date().toISOString();
        gameData.totalScore += score;
        
        if (score >= (maxScore * 0.6)) {
            gameData.completions++;
        }
        
        if (score > gameData.bestScore) {
            gameData.bestScore = score;
        }
        
        // Store attempt history (last 10)
        gameData.attemptHistory.push({
            score: score,
            maxScore: maxScore,
            timestamp: new Date().toISOString(),
            percentage: (score / maxScore) * 100
        });
        
        if (gameData.attemptHistory.length > 10) {
            gameData.attemptHistory.shift();
        }
        
        // Update total score
        this.userDatabase.totalScore += score;
        this.userDatabase.totalGamesPlayed++;
        
        // Update subject progress
        this.updateSubjectProgress(subject, score, maxScore);
        
        // Check for achievements
        this.checkAchievements(gameId);
        
        // save to legacy localStorage for backwards compatibility
        this._saveLegacyEntry({
            gameId,
            gameTitle: gameName,
            score,
            maxScore,
            subject,
            timestamp: new Date().toISOString()
        });
        
        this.saveProgress();

        // Send this session to server if authenticated
        try {
            const token = localStorage.getItem('eduquest_token');
            if (token) {
                fetch('/api/me/game-sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        gameId,
                        gameName,
                        subject,
                        score,
                        maxScore
                    })
                }).then(res => {
                    if (!res.ok) console.warn('Failed to post game session to server');
                }).catch(err => {
                    console.warn('Error posting game session', err);
                });
            }
        } catch (e) {
            console.warn('Unable to sync session to server', e);
        }
        return gameData;
    },
    
    /**
     * Update subject-wise progress
     */
    updateSubjectProgress(subject, score, maxScore = 100) {
        if (!this.userDatabase.subjectProgress[subject]) {
            this.userDatabase.subjectProgress[subject] = {
                subject: subject,
                gamesPlayed: 0,
                gamesCompleted: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                weakAreas: [],
                strongAreas: []
            };
        }
        
        const subjectData = this.userDatabase.subjectProgress[subject];
        subjectData.gamesPlayed++;
        subjectData.totalScore += score;
        subjectData.averageScore = (subjectData.totalScore / subjectData.gamesPlayed);
        
        if (score > subjectData.bestScore) {
            subjectData.bestScore = score;
        }
        
        // Track weak areas (score < 60%)
        if ((score / maxScore) * 100 < 60) {
            if (!subjectData.weakAreas.includes(subject)) {
                subjectData.weakAreas.push(subject);
            }
        } else {
            subjectData.gamesCompleted++;
            subjectData.weakAreas = subjectData.weakAreas.filter(a => a !== subject);
            if (!subjectData.strongAreas.includes(subject)) {
                subjectData.strongAreas.push(subject);
            }
        }
    },
    
    /**
     * Get overall performance stats
     */
    getPerformanceStats() {
        const stats = {
            totalGamesPlayed: this.userDatabase.totalGamesPlayed,
            totalScore: this.userDatabase.totalScore,
            averageScore: this.userDatabase.totalGamesPlayed > 0 
                ? (this.userDatabase.totalScore / this.userDatabase.totalGamesPlayed) 
                : 0,
            subjects: this.userDatabase.subjectProgress,
            completionRate: this.calculateCompletionRate(),
            weeklyActivity: this.getWeeklyActivity(),
            strongSubjects: this.getStrongSubjects(),
            weakSubjects: this.getWeakSubjects()
        };
        return stats;
    },
    
    /**
     * Calculate completion rate
     */
    calculateCompletionRate() {
        const totalGames = Object.keys(this.userDatabase.gameProgress).length;
        const completedGames = Object.values(this.userDatabase.gameProgress)
            .filter(game => game.completions > 0).length;
        
        return totalGames > 0 ? (completedGames / totalGames) * 100 : 0;
    },
    
    /**
     * Get weak subjects for focus
     */
    getWeakSubjects() {
        return Object.values(this.userDatabase.subjectProgress)
            .filter(subject => subject.averageScore < 60)
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 5);
    },
    
    /**
     * Get strong subjects
     */
    getStrongSubjects() {
        return Object.values(this.userDatabase.subjectProgress)
            .filter(subject => subject.averageScore >= 75)
            .sort((a, b) => b.averageScore - a.averageScore);
    },
    
    /**
     * Get weekly activity
     */
    getWeeklyActivity() {
        const weeklyData = {};
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            weeklyData[dateKey] = 0;
        }
        
        Object.values(this.userDatabase.gameProgress).forEach(game => {
            game.attemptHistory.forEach(attempt => {
                const attemptDate = attempt.timestamp.split('T')[0];
                if (weeklyData.hasOwnProperty(attemptDate)) {
                    weeklyData[attemptDate]++;
                }
            });
        });
        
        return weeklyData;
    },
    
    /**
     * Check and award achievements
     */
    checkAchievements(gameId) {
        const achievements = {
            'first_game': {
                id: 'first_game',
                name: '🎮 Game Master',
                desc: 'Complete your first game',
                condition: () => this.userDatabase.totalGamesPlayed >= 1
            },
            'game_streak_5': {
                id: 'game_streak_5',
                name: '🔥 On Fire!',
                desc: 'Complete 5 games',
                condition: () => this.userDatabase.totalGamesPlayed >= 5
            },
            'game_streak_10': {
                id: 'game_streak_10',
                name: '⭐ Super Star',
                desc: 'Complete 10 games',
                condition: () => this.userDatabase.totalGamesPlayed >= 10
            },
            'perfect_score': {
                id: 'perfect_score',
                name: '💯 Perfect!',
                desc: 'Score 100% on any game',
                condition: () => Object.values(this.userDatabase.gameProgress)
                    .some(game => game.bestScore === 100)
            },
            'high_scorer': {
                id: 'high_scorer',
                name: '🏆 High Scorer',
                desc: 'Average score above 80%',
                condition: () => this.getPerformanceStats().averageScore >= 80
            },
            'consistency': {
                id: 'consistency',
                name: '📚 Consistent Learner',
                desc: 'Play for 7 consecutive days',
                condition: () => this.checkConsecutiveDays() >= 7
            },
            'subject_master': {
                id: 'subject_master',
                name: '🎓 Subject Master',
                desc: 'Score 80% or higher in any subject',
                condition: () => Object.values(this.userDatabase.subjectProgress)
                    .some(subject => subject.averageScore >= 80)
            },
            'speedy': {
                id: 'speedy',
                name: '⚡ Speed Demon',
                desc: 'Complete 20 games',
                condition: () => this.userDatabase.totalGamesPlayed >= 20
            }
        };
        
        Object.values(achievements).forEach(achievement => {
            if (achievement.condition() && !this.userDatabase.achievements.find(a => a.id === achievement.id)) {
                this.awardAchievement(achievement);
            }
        });
    },
    
    /**
     * Award achievement to user
     */
    awardAchievement(achievement) {
        this.userDatabase.achievements.push({
            ...achievement,
            awardedDate: new Date().toISOString()
        });
        this.saveProgress();
        this.triggerAchievementNotification(achievement);
    },
    
    /**
     * Check consecutive days
     */
    checkConsecutiveDays() {
        const weeklyActivity = this.getWeeklyActivity();
        let consecutive = 0;
        const dates = Object.keys(weeklyActivity).sort().reverse();
        
        for (let date of dates) {
            if (weeklyActivity[date] > 0) {
                consecutive++;
            } else {
                break;
            }
        }
        
        return consecutive;
    },
    
    /**
     * Trigger achievement notification
     */
    triggerAchievementNotification(achievement) {
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'achievement-notification';
        toast.innerHTML = `
            <div class="achievement-content">
                <h3>${achievement.name}</h3>
                <p>${achievement.desc}</p>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.5s ease-out;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },
    
    /**
     * Get specific game progress
     */
    getGameProgress(gameId) {
        return this.userDatabase.gameProgress[gameId] || null;
    },
    
    /**
     * Get subject progress
     */
    getSubjectProgress(subject) {
        return this.userDatabase.subjectProgress[subject] || null;
    },
    
    /**
     * Save progress to localStorage
     */
    saveProgress() {
        this.userDatabase.lastActive = new Date().toISOString();
        localStorage.setItem('studentProgress', JSON.stringify(this.userDatabase));
        // Also trigger analytics update
        this.updateDailyStats();
    },
    
    /**
     * Update daily statistics
     */
    updateDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        const existingToday = this.userDatabase.dailyStats.find(stat => stat.date === today);
        
        if (existingToday) {
            existingToday.gamesPlayed++;
        } else {
            this.userDatabase.dailyStats.push({
                date: today,
                gamesPlayed: 1
            });
        }
        
        localStorage.setItem('studentProgress', JSON.stringify(this.userDatabase));
    },
    
    /**
     * Export progress as report
     */
    exportProgressReport() {
        return {
            userData: this.userDatabase,
            stats: this.getPerformanceStats(),
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Reset progress (for testing)
     */
    resetProgress() {
        localStorage.removeItem('studentProgress');
        this.initializeUser();
    },

    /* ======= legacy compatibility helpers ======= */

    // called internally when recordGameCompletion is used
    _saveLegacyEntry(entry) {
        try {
            const history = JSON.parse(localStorage.getItem('gamesHistory') || '[]');
            history.push({
                gameId: entry.gameId,
                gameTitle: entry.gameTitle,
                score: entry.score,
                timeInSeconds: 0,
                itemsLearned: 0,
                completedAt: entry.timestamp
            });
            localStorage.setItem('gamesHistory', JSON.stringify(history));
            let total = parseInt(localStorage.getItem('totalGameScore') || '0');
            total += entry.score;
            localStorage.setItem('totalGameScore', total);
        } catch (e) {
            console.warn('legacy sync failed', e);
        }
    },

    // read existing legacy storage and import into database
    syncLegacyData() {
        try {
            const history = JSON.parse(localStorage.getItem('gamesHistory') || '[]');
            history.forEach(item => {
                // if the score has not been recorded yet, add it
                const prog = this.userDatabase.gameProgress[item.gameId];
                if (!prog || prog.totalScore < item.score) {
                    this.recordGameCompletion(
                        item.gameId,
                        item.gameTitle || 'Unknown Game',
                        item.subject || 'general',
                        item.score,
                        item.maxScore || 100
                    );
                }
            });
        } catch (e) {
            console.warn('syncLegacyData error', e);
        }
    }
};

// override localStorage.setItem to detect new legacy entries
(function() {
    const originalSet = Storage.prototype.setItem;
    let prevHistoryLen = JSON.parse(localStorage.getItem('gamesHistory') || '[]').length;
    Storage.prototype.setItem = function(key, value) {
        originalSet.apply(this, arguments);
        if (key === 'gamesHistory') {
            try {
                const history = JSON.parse(value);
                if (history.length > prevHistoryLen) {
                    const newEntry = history[history.length - 1];
                    if (newEntry && !ProgressTracker.getGameProgress(newEntry.gameId)) {
                        ProgressTracker.recordGameCompletion(
                            newEntry.gameId,
                            newEntry.gameTitle || 'Unknown',
                            newEntry.subject || 'general',
                            newEntry.score || 0,
                            newEntry.maxScore || 100
                        );
                    }
                }
                prevHistoryLen = history.length;
            } catch (err) {
                // ignore
            }
        }
    };
})();


// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ProgressTracker.initializeUser();
});
