// ============================================
// GLOBAL TIMER SERVICE - Persistent Across All Pages
// ============================================
// यह timer सभी pages में चलता है जब तक website open है

class GlobalTimer {
    constructor() {
        this.sessionStartTime = null;
        this.sessionDuration = 0;
        this.isActive = false;
        this.timerDisplay = null;
        this.userEmail = null;
        this.sessionData = {
            startTime: null,
            pages: [],
            totalTime: 0
        };
    }

    // Initialize timer on page load
    init(userEmail) {
        this.userEmail = userEmail;
        
        // Check if session already exists
        const existingSession = sessionStorage.getItem('globalTimerSession');
        if (existingSession) {
            const session = JSON.parse(existingSession);
            this.sessionStartTime = new Date(session.startTime);
            this.sessionDuration = session.duration || 0;
        } else {
            // New session
            this.sessionStartTime = new Date();
            sessionStorage.setItem('globalTimerSession', JSON.stringify({
                startTime: this.sessionStartTime.toISOString(),
                duration: 0
            }));
        }

        // Start the timer
        this.start();
        
        // Track current page
        this.trackPageVisit(window.location.pathname);
        
        // Track page changes
        window.addEventListener('hashchange', () => {
            this.trackPageVisit(window.location.pathname);
        });

        // Save data on page unload
        window.addEventListener('beforeunload', () => {
            this.saveSessionData();
        });
    }

    // Start the timer
    start() {
        if (this.isActive) return;
        this.isActive = true;
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    // Update timer display
    updateTimer() {
        const now = new Date();
        const elapsedSeconds = Math.floor((now - this.sessionStartTime) / 1000);
        
        // Update session storage
        const session = JSON.parse(sessionStorage.getItem('globalTimerSession'));
        session.duration = elapsedSeconds;
        sessionStorage.setItem('globalTimerSession', JSON.stringify(session));
        
        // Update all timer displays on page
        this.updateAllTimerDisplays(elapsedSeconds);
        
        // Every minute, save to localStorage for persistence
        if (elapsedSeconds % 60 === 0) {
            this.saveDailyUsage(elapsedSeconds);
        }
    }

    // Update timer displays on current page
    updateAllTimerDisplays(elapsedSeconds) {
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const timeStringHH = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Update navbar timer (if exists) - shows MM:SS
        const navTimer = document.getElementById('globalTimerDisplay');
        if (navTimer) {
            navTimer.textContent = timeString;
        }

        // Update any other timer elements marked with data-role (MM:SS)
        const timerElements = document.querySelectorAll('[data-role="global-timer"]');
        timerElements.forEach(el => {
            el.textContent = timeString;
        });

        // Also update dashboard screen timer (HH:MM:SS) if present
        const screenTimer = document.getElementById('screenTimerDisplay');
        if (screenTimer) {
            screenTimer.textContent = timeStringHH;
        }
    }

    // Track page visit
    trackPageVisit(page) {
        const session = JSON.parse(sessionStorage.getItem('globalTimerSession'));
        if (!session.pages) {
            session.pages = [];
        }
        session.pages.push({
            page: page,
            visitedAt: new Date().toISOString()
        });
        sessionStorage.setItem('globalTimerSession', JSON.stringify(session));
    }

    // Save daily usage to localStorage
    saveDailyUsage(elapsedSeconds) {
        if (!this.userEmail) return;
        
        const today = new Date().toDateString();
        const storageKey = `screenUsage_${this.userEmail}_${today}`;
        
        // Get existing usage for today
        const existingUsage = parseInt(localStorage.getItem(storageKey)) || 0;
        
        // Add current session time
        const totalUsage = existingUsage + elapsedSeconds;
        localStorage.setItem(storageKey, totalUsage.toString());
        
        // Also update total usage
        const totalKey = `totalScreenUsage_${this.userEmail}`;
        const totalExisting = parseInt(localStorage.getItem(totalKey)) || 0;
        localStorage.setItem(totalKey, (totalExisting + 60).toString()); // Every minute
    }

    // Save session data on unload
    saveSessionData() {
        const session = JSON.parse(sessionStorage.getItem('globalTimerSession'));
        if (session && this.userEmail) {
            const today = new Date().toDateString();
            const storageKey = `screenUsage_${this.userEmail}_${today}`;
            const existingUsage = parseInt(localStorage.getItem(storageKey)) || 0;
            localStorage.setItem(storageKey, (existingUsage + session.duration).toString());
        }
    }

    // Get elapsed time
    getElapsedTime() {
        const now = new Date();
        return Math.floor((now - this.sessionStartTime) / 1000);
    }

    // Get time in formatted string
    getFormattedTime() {
        const seconds = this.getElapsedTime();
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Stop timer
    stop() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.isActive = false;
            this.saveSessionData();
        }
    }

    // Pause timer
    pause() {
        this.stop();
    }

    // Resume timer
    resume() {
        if (!this.isActive) {
            this.start();
        }
    }

    // Reset timer
    reset() {
        this.stop();
        this.sessionStartTime = new Date();
        this.sessionDuration = 0;
        sessionStorage.removeItem('globalTimerSession');
        this.start();
    }

    // Get session info
    getSessionInfo() {
        return {
            startTime: this.sessionStartTime,
            elapsedTime: this.getElapsedTime(),
            formattedTime: this.getFormattedTime(),
            isActive: this.isActive
        };
    }
}

// Initialize global timer on page load
let globalTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get user email from localStorage
    const userEmail = localStorage.getItem('userEmail') || 'anonymous';
    
    // Initialize global timer
    globalTimer = new GlobalTimer();
    globalTimer.init(userEmail);
    
    // Log initialization
    console.log('✅ Global Timer Initialized - Will track time across all pages');
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalTimer;
}
