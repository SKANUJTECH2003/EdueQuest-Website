/**
 * AUDIO-BASED LEARNING SYSTEM
 * Provides text-to-speech, voice instructions, and audio support
 */

const AudioSupport = {
    isEnabled: localStorage.getItem('audioEnabled') === 'true' || false,
    currentLanguage: localStorage.getItem('audioLanguage') || 'en',
    volume: parseFloat(localStorage.getItem('audioVolume')) || 1.0,
    
    // Speech synthesis instance
    synth: window.speechSynthesis,
    currentUtterance: null,
    
    /**
     * Initialize Audio System
     */
    init() {
        this.createAudioControls();
        this.setupKeyboardShortcuts();
    },
    
    /**
     * Create floating audio controls
     */
    createAudioControls() {
        const controlsHTML = `
            <div id="audioControlsPanel" class="audio-controls-panel">
                <button id="audioToggleBtn" class="audio-btn" title="Toggle Audio (Alt+A)">
                    🔊
                </button>
                <div id="audioMenu" class="audio-menu" style="display: none;">
                    <div class="audio-menu-header">
                        <h3>🎵 Audio Settings</h3>
                        <button class="close-menu-btn" onclick="AudioSupport.closeAudioMenu()">×</button>
                    </div>
                    
                    <div class="menu-section">
                        <label class="audio-toggle">
                            <input type="checkbox" id="audioEnabledToggle" ${this.isEnabled ? 'checked' : ''}>
                            <span>Enable Audio</span>
                        </label>
                    </div>
                    
                    <div class="menu-section">
                        <label for="audioLanguageSelect">Language:</label>
                        <select id="audioLanguageSelect">
                            <option value="en">English</option>
                            <option value="hi">Hindi (हिंदी)</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                        </select>
                    </div>
                    
                    <div class="menu-section">
                        <label for="audioVolumeSlider">Volume:</label>
                        <input type="range" id="audioVolumeSlider" min="0" max="1" step="0.1" value="${this.volume}">
                        <span class="volume-display">${Math.round(this.volume * 100)}%</span>
                    </div>
                    
                    <div class="menu-section">
                        <label for="audioSpeedSlider">Speed:</label>
                        <input type="range" id="audioSpeedSlider" min="0.5" max="2" step="0.1" value="1">
                        <span class="speed-display">1x</span>
                    </div>
                    
                    <button class="test-audio-btn" onclick="AudioSupport.testAudio()">
                        🎤 Test Audio
                    </button>
                </div>
            </div>
        `;
        
        // Add to body if not already present
        if (!document.getElementById('audioControlsPanel')) {
            document.body.insertAdjacentHTML('beforeend', controlsHTML);
            this.attachAudioEventListeners();
        }
    },
    
    /**
     * Attach event listeners to audio controls
     */
    attachAudioEventListeners() {
        const toggleBtn = document.getElementById('audioToggleBtn');
        const menu = document.getElementById('audioMenu');
        const enabledToggle = document.getElementById('audioEnabledToggle');
        const languageSelect = document.getElementById('audioLanguageSelect');
        const volumeSlider = document.getElementById('audioVolumeSlider');
        const speedSlider = document.getElementById('audioSpeedSlider');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        if (enabledToggle) {
            enabledToggle.addEventListener('change', (e) => {
                this.isEnabled = e.target.checked;
                localStorage.setItem('audioEnabled', this.isEnabled);
                this.updateAudioButtonState();
            });
        }
        
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
            languageSelect.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                localStorage.setItem('audioLanguage', this.currentLanguage);
            });
        }
        
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.volume = parseFloat(e.target.value);
                localStorage.setItem('audioVolume', this.volume);
                document.querySelector('.volume-display').textContent = `${Math.round(this.volume * 100)}%`;
            });
        }
        
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                document.querySelector('.speed-display').textContent = `${speed.toFixed(1)}x`;
            });
        }
    },
    
    /**
     * Close audio menu
     */
    closeAudioMenu() {
        const menu = document.getElementById('audioMenu');
        if (menu) menu.style.display = 'none';
    },
    
    /**
     * Update audio button state
     */
    updateAudioButtonState() {
        const btn = document.getElementById('audioToggleBtn');
        if (btn) {
            btn.style.opacity = this.isEnabled ? '1' : '0.5';
            btn.title = this.isEnabled ? 'Audio Enabled (Alt+A)' : 'Audio Disabled (Alt+A)';
        }
    },
    
    /**
     * Speak text
     */
    speak(text, callback) {
        if (!this.isEnabled) {
            if (callback) callback();
            return;
        }
        
        // Cancel any existing speech
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language
        const languageMap = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'es': 'es-ES',
            'fr': 'fr-FR'
        };
        utterance.lang = languageMap[this.currentLanguage] || 'en-US';
        
        // Set voice properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = this.volume;
        
        // Callback when finished
        if (callback) {
            utterance.onend = callback;
        }
        
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    },
    
    /**
     * Test audio functionality
     */
    testAudio() {
        const testMessages = {
            'en': 'Hello! Audio is working perfectly. Welcome to EduQuest!',
            'hi': 'नमस्ते! ऑडियो सही काम कर रहा है। EduQuest में आपका स्वागत है!',
            'es': '¡Hola! El audio funciona perfectamente. ¡Bienvenido a EduQuest!',
            'fr': 'Bonjour! L\'audio fonctionne parfaitement. Bienvenue à EduQuest!'
        };
        
        const message = testMessages[this.currentLanguage] || testMessages['en'];
        this.speak(message);
    },
    
    /**
     * Add audio to game instructions
     */
    addAudioToElement(element, text, delay = 0) {
        if (!element) return;
        
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-instruction-btn';
        audioBtn.innerHTML = '🔊';
        audioBtn.title = 'Listen to instruction';
        audioBtn.onclick = (e) => {
            e.preventDefault();
            setTimeout(() => this.speak(text), delay);
        };
        
        element.appendChild(audioBtn);
    },
    
    /**
     * Read game question aloud
     */
    readQuestion(question) {
        if (this.isEnabled) {
            this.speak(question);
        }
    },
    
    /**
     * Read game options
     */
    readOptions(options) {
        if (!this.isEnabled) return;
        
        let optionText = 'The options are: ';
        options.forEach((option, index) => {
            optionText += `${index + 1}. ${option}. `;
        });
        
        this.speak(optionText);
    },
    
    /**
     * Provide feedback voice
     */
    provideVoiceFeedback(isCorrect) {
        if (!this.isEnabled) return;
        
        const feedbackMap = {
            'en': { correct: '🎉 Correct! Great job!', incorrect: '❌ That\'s not right. Try again!' },
            'hi': { correct: '🎉 सही! शानदार!', incorrect: '❌ यह गलत है। फिर से कोशिश करो!' },
            'es': { correct: '🎉 ¡Correcto! ¡Buen trabajo!', incorrect: '❌ ¡Eso no es correcto! ¡Intenta de nuevo!' },
            'fr': { correct: '🎉 Correct! Excellent travail!', incorrect: '❌ Ce n\'est pas correct. Réessaye!' }
        };
        
        const feedbackText = isCorrect 
            ? feedbackMap[this.currentLanguage]?.correct || feedbackMap['en'].correct
            : feedbackMap[this.currentLanguage]?.incorrect || feedbackMap['en'].incorrect;
        
        this.speak(feedbackText.replace(/[🎉❌]/g, ''));
    },
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt+A to toggle audio
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                const toggle = document.getElementById('audioEnabledToggle');
                if (toggle) {
                    toggle.checked = !toggle.checked;
                    this.isEnabled = toggle.checked;
                    localStorage.setItem('audioEnabled', this.isEnabled);
                    this.updateAudioButtonState();
                }
            }
            
            // Alt+S to speak last focused text
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                this.testAudio();
            }
        });
    },
    
    /**
     * Stop audio
     */
    stop() {
        this.synth.cancel();
    }
};

// Audio Styles
const audioStyles = `
    .audio-controls-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
    }
    
    .audio-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        font-size: 1.8rem;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
    }
    
    .audio-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
    }
    
    .audio-btn:active {
        transform: scale(0.95);
    }
    
    .audio-menu {
        position: absolute;
        bottom: 80px;
        right: 0;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        padding: 1.5rem;
        min-width: 280px;
        animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .audio-menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 1rem;
    }
    
    .audio-menu-header h3 {
        margin: 0;
        color: #1a73e8;
        font-size: 1.1rem;
    }
    
    .close-menu-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #5f6368;
    }
    
    .menu-section {
        margin-bottom: 1.5rem;
    }
    
    .menu-section label {
        display: block;
        font-weight: 700;
        color: #1a73e8;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    
    .audio-toggle {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
        color: #202124;
    }
    
    .audio-toggle input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-right: 0.75rem;
        cursor: pointer;
    }
    
    .menu-section select,
    .menu-section input[type="range"] {
        width: 100%;
        padding: 0.5rem;
        border: 2px solid #dadce0;
        border-radius: 8px;
        font-size: 0.9rem;
        color: #202124;
    }
    
    .menu-section input[type="range"] {
        padding: 0;
    }
    
    .volume-display,
    .speed-display {
        float: right;
        color: #5f6368;
        font-size: 0.85rem;
        font-weight: 700;
    }
    
    .test-audio-btn {
        width: 100%;
        padding: 0.8rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .test-audio-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .audio-instruction-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.1rem;
        margin-left: 0.5rem;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    
    .audio-instruction-btn:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    @media (max-width: 480px) {
        .audio-controls-panel {
            bottom: 10px;
            right: 10px;
        }
        
        .audio-btn {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
        }
        
        .audio-menu {
            min-width: 240px;
            padding: 1rem;
        }
    }
`;

// Inject styles
if (!document.getElementById('audio-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'audio-styles';
    styleSheet.textContent = audioStyles;
    document.head.appendChild(styleSheet);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    AudioSupport.init();
});
