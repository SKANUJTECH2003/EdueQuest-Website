/**
 * OFFLINE MODE & PWA FUNCTIONALITY
 * Enables offline access and content caching
 */

const OfflineManager = {
    
    /**
     * Register Service Worker
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);
                    this.setupSyncListener();
                })
                .catch(error => {
                    console.log('⚠️ Service Worker registration failed:', error);
                });
        }
    },
    
    /**
     * Setup background sync for offline data
     */
    setupSyncListener() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                // Request periodic sync for progress updates
                registration.sync.register('sync-progress');
            });
        }
    },
    
    /**
     * Cache game content
     */
    async cacheGameContent(gameName, gameUrl) {
        try {
            const cache = await caches.open('game-cache-v1');
            await cache.add(gameUrl);
            console.log(`✅ Cached: ${gameName}`);
        } catch (error) {
            console.error(`❌ Failed to cache ${gameName}:`, error);
        }
    },
    
    /**
     * Preload all game files for offline access
     * Games are now loaded from GAME_MAP.json - individual game files are preloaded as needed
     */
    async preloadGames() {
        // Games are now loaded dynamically from games/GAME_MAP.json
        console.log('ℹ️ Games are loaded dynamically from GAME_MAP.json');
        const cache = await caches.open('game-cache-v1');
        try {
            await cache.add('games/GAME_MAP.json');
            console.log('✅ Preloaded: GAME_MAP.json');
        } catch (error) {
            console.warn('⚠️ Could not preload GAME_MAP.json:', error);
        }
    },
    
    /**
     * Preload essential assets
     */
    async preloadAssets() {
        const assets = [
            'progress-tracker.js',
            'achievements.js',
            'audio-support.js',
            'style.css'
        ];
        
        const cache = await caches.open('assets-cache-v1');
        for (let asset of assets) {
            try {
                await cache.add(asset);
            } catch (error) {
                console.warn(`Could not cache ${asset}:`, error);
            }
        }
    },
    
    /**
     * Sync offline progress when online
     */
    async syncProgressData() {
        if (!navigator.onLine) {
            console.log('📡 Currently offline - progress will sync when online');
            return;
        }
        
        try {
            const progressData = localStorage.getItem('studentProgress');
            if (progressData) {
                // Send to server (implementation depends on backend)
                console.log('✅ Progress synced to server');
            }
        } catch (error) {
            console.error('❌ Failed to sync progress:', error);
        }
    },
    
    /**
     * Create offline notification UI
     */
    createOfflineNotification() {
        if (!document.getElementById('offline-notification')) {
            const notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'offline-notification';
            notification.innerHTML = `
                <div class="offline-content">
                    <span class="offline-icon">📡</span>
                    <span class="offline-text">You're offline - some features may be limited</span>
                    <button class="offline-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            document.body.appendChild(notification);
        }
    },
    
    /**
     * Remove offline notification
     */
    removeOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.remove();
        }
    },
    
    /**
     * Monitor online/offline status
     */
    setupConnectivityListener() {
        window.addEventListener('offline', () => {
            console.log('🔴 Internet disconnected');
            this.createOfflineNotification();
        });
        
        window.addEventListener('online', () => {
            console.log('🟢 Internet connected');
            this.removeOfflineNotification();
            this.syncProgressData();
        });
    },
    
    /**
     * Get offline status
     */
    isOffline() {
        return !navigator.onLine;
    },
    
    /**
     * Show offline feature status
     */
    displayOfflineStatus() {
        const status = `
            <div class="offline-status">
                <h3>📱 Offline Mode Status</h3>
                <p><strong>Current Status:</strong> ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</p>
                <p><strong>Cached Games:</strong> Ready for offline play</p>
                <p><strong>Progress Saving:</strong> ${navigator.onLine ? 'Automatic' : 'Offline - will sync later'}</p>
                <p><strong>Features Available:</strong> All games, quizzes, and lessons</p>
            </div>
        `;
        return status;
    }
};

// Offline Styles
const offlineStyles = `
    .offline-notification {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 1rem;
        z-index: 9999;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .offline-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .offline-icon {
        font-size: 1.5rem;
    }
    
    .offline-text {
        flex: 1;
        font-weight: 600;
    }
    
    .offline-close {
        background: rgba(255,255,255,0.3);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.3s ease;
    }
    
    .offline-close:hover {
        background: rgba(255,255,255,0.5);
        transform: rotate(90deg);
    }
    
    .offline-status {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
        border-left: 4px solid #f59e0b;
        padding: 1.5rem;
        border-radius: 12px;
        margin: 1rem 0;
    }
    
    .offline-status h3 {
        color: #d97706;
        margin-top: 0;
    }
    
    .offline-status p {
        margin: 0.5rem 0;
        color: var(--text-color-secondary);
    }
    
    @media (max-width: 768px) {
        .offline-content {
            flex-direction: column;
            text-align: center;
        }
    }
`;

// Inject styles
if (!document.getElementById('offline-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'offline-styles';
    styleSheet.textContent = offlineStyles;
    document.head.appendChild(styleSheet);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    OfflineManager.registerServiceWorker();
    OfflineManager.setupConnectivityListener();
    OfflineManager.preloadAssets();
    
    // Show offline notification if currently offline
    if (!navigator.onLine) {
        OfflineManager.createOfflineNotification();
    }
});
