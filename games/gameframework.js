/**
 * EduQuest Game Framework
 * Universal utilities for all games - handles scoring, theming, and authentication
 */

// Theme configuration matching EduQuest website
const EDUQUEST_THEME = {
    colors: {
        primary: '#1a73e8',      // Blue
        secondary: '#e8f0fe',    // Light blue
        success: '#34a853',      // Green
        danger: '#d33b27',       // Red
        warning: '#fbbc04',      // Yellow
        dark: '#202124',         // Dark
        light: '#f7f9fc',        // Light
        text: '#333',            // Dark text
        textSecondary: '#666',   // Gray text
    },
    fonts: {
        family: "'Poppins', 'Montserrat', sans-serif",
        sizes: {
            small: '0.875rem',
            normal: '1rem',
            large: '1.25rem',
            xlarge: '1.5rem',
            xxlarge: '2rem'
        }
    }
};

/**
 * Game Manager - Handle scoring, authentication, and data persistence
 */
class GameManager {
    constructor(gameName, gameSubject = 'general') {
        this.gameName = gameName;
        this.gameSubject = gameSubject;
        this.score = 0;
        this.maxScore = 100;
        this.startTime = Date.now();
        this.initialized = false;
    }

    /**
     * Initialize game - Check authentication
     */
    init() {
        const token = localStorage.getItem('eduquest_token');
        if (!token) {
            alert('Please login to play games!');
            window.location.href = '/login.html';
            return false;
        }
        
        this.userEmail = localStorage.getItem('eduquest_user_email');
        this.userName = localStorage.getItem('eduquest_user_name');
        this.initialized = true;
        return true;
    }

    /**
     * Update UI with current score
     */
    updateScoreUI(scoreElement) {
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }

    /**
     * Add points to score
     */
    addPoints(points) {
        this.score = Math.min(this.score + points, this.maxScore);
        return this.score;
    }

    /**
     * Update score on server with JWT authentication
     */
    async updateScoreOnServer() {
        if (!this.initialized || !this.userEmail) {
            console.error('Game not initialized');
            return false;
        }

        try {
            const token = localStorage.getItem('eduquest_token');
            const response = await fetch('/api/update-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    points: this.score,
                    subject: this.gameSubject,
                    gameName: this.gameName,
                    playedAt: new Date().toISOString()
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Score updated:', data);
                
                // Update localStorage
                localStorage.setItem('eduquest_user_points', data.user.points);
                localStorage.setItem('totalScore', data.user.points);
                
                return true;
            } else {
                const error = await response.json();
                console.error('❌ Failed to update score:', error);
                return false;
            }
        } catch (error) {
            console.error('🔴 Error updating score:', error);
            return false;
        }
    }

    /**
     * Show completion popup
     */
    showCompletionPopup(onClose) {
        const popup = document.createElement('div');
        popup.className = 'game-completion-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-icon">🎉</div>
                <h2>Congratulations!</h2>
                <p class="user-name">Well played, ${this.userName}!</p>
                <div class="score-display">
                    <span class="score-label">Your Score:</span>
                    <span class="score-value">${this.score}/${this.maxScore}</span>
                </div>
                <div class="popup-actions">
                    <button class="btn-primary" onclick="this.closest('.game-completion-popup').remove(); location.href='/subjects.html'">
                        Back to Subjects
                    </button>
                    <button class="btn-secondary" onclick="location.reload()">
                        Play Again
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    }

    /**
     * Get game time in seconds
     */
    getGameTimeSeconds() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
}

/**
 * Apply EduQuest theme to a page
 */
function applyEduQuestTheme() {
    const style = document.createElement('style');
    style.textContent = `
        /* EduQuest Theme Stylesheet */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ${EDUQUEST_THEME.fonts.family};
            background: linear-gradient(135deg, ${EDUQUEST_THEME.colors.secondary} 0%, #ffffff 100%);
            color: ${EDUQUEST_THEME.colors.text};
            min-height: 100vh;
            padding: 20px;
        }

        /* Header */
        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
        }

        .game-header h1 {
            color: ${EDUQUEST_THEME.colors.primary};
            font-size: ${EDUQUEST_THEME.fonts.sizes.xxlarge};
        }

        .game-header-right {
            display: flex;
            gap: 2rem;
            align-items: center;
        }

        .game-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }

        .game-stat-label {
            font-size: ${EDUQUEST_THEME.fonts.sizes.small};
            color: ${EDUQUEST_THEME.colors.textSecondary};
        }

        .game-stat-value {
            font-size: ${EDUQUEST_THEME.fonts.sizes.large};
            font-weight: 700;
            color: ${EDUQUEST_THEME.colors.primary};
        }

        /* Game Container */
        .game-container {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            max-width: 900px;
            margin: 0 auto;
            text-align: center;
        }

        /* Buttons */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: ${EDUQUEST_THEME.fonts.sizes.normal};
            transition: all 0.3s ease;
            margin: 5px;
        }

        .btn-primary {
            background: ${EDUQUEST_THEME.colors.primary};
            color: white;
        }

        .btn-primary:hover {
            background: #1557b0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
        }

        .btn-secondary {
            background: ${EDUQUEST_THEME.colors.secondary};
            color: ${EDUQUEST_THEME.colors.primary};
            border: 2px solid ${EDUQUEST_THEME.colors.primary};
        }

        .btn-secondary:hover {
            background: ${EDUQUEST_THEME.colors.primary};
            color: white;
        }

        .btn-success {
            background: ${EDUQUEST_THEME.colors.success};
            color: white;
        }

        .btn-success:hover {
            background: #2d8c48;
        }

        .btn-danger {
            background: ${EDUQUEST_THEME.colors.danger};
            color: white;
        }

        .btn-danger:hover {
            background: #b82412;
        }

        /* Game Completion Popup */
        .game-completion-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .popup-content {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            animation: popupSlideIn 0.4s ease;
        }

        @keyframes popupSlideIn {
            from {
                transform: scale(0.8);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        .popup-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: bounce 0.6s ease infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .popup-content h2 {
            color: ${EDUQUEST_THEME.colors.primary};
            font-size: ${EDUQUEST_THEME.fonts.sizes.xxlarge};
            margin-bottom: 0.5rem;
        }

        .user-name {
            color: ${EDUQUEST_THEME.colors.textSecondary};
            font-size: ${EDUQUEST_THEME.fonts.sizes.normal};
            margin-bottom: 1rem;
        }

        .score-display {
            background: ${EDUQUEST_THEME.colors.secondary};
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .score-label {
            color: ${EDUQUEST_THEME.colors.textSecondary};
        }

        .score-value {
            font-size: ${EDUQUEST_THEME.fonts.sizes.xlarge};
            font-weight: 700;
            color: ${EDUQUEST_THEME.colors.success};
        }

        .popup-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }

        /* Timer */
        .timer {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: ${EDUQUEST_THEME.colors.warning};
            color: white;
            border-radius: 20px;
            font-weight: 600;
        }

        .timer.low {
            background: ${EDUQUEST_THEME.colors.danger};
            animation: pulse 0.5s ease infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .game-header {
                flex-direction: column;
                gap: 1rem;
            }

            .game-header-right {
                width: 100%;
                justify-content: space-around;
            }

            .popup-content {
                margin: 20px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Auto-apply theme when script loads
document.addEventListener('DOMContentLoaded', () => {
    applyEduQuestTheme();
});

// Export for use in games
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameManager, EDUQUEST_THEME, applyEduQuestTheme };
}
