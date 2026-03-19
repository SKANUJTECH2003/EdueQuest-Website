/**
 * ACHIEVEMENTS & CERTIFICATES SYSTEM
 * Manages badges, milestones, and digital certificates
 */

const AchievementSystem = {
    
    /**
     * Get all achievements
     */
    getAllAchievements() {
        return ProgressTracker.userDatabase.achievements;
    },
    
    /**
     * Get achievement by ID
     */
    getAchievement(achievementId) {
        return ProgressTracker.userDatabase.achievements.find(a => a.id === achievementId);
    },
    
    /**
     * Get achievements by category
     */
    getAchievementsByCategory(category) {
        const categories = {
            'gameplay': ['first_game', 'game_streak_5', 'game_streak_10', 'speedy'],
            'performance': ['perfect_score', 'high_scorer', 'subject_master'],
            'consistency': ['consistency']
        };
        return categories[category] || [];
    },
    
    /**
     * Generate Digital Certificate
     */
    generateCertificate(type = 'completion', subject = null) {
        const stats = ProgressTracker.getPerformanceStats();
        const date = new Date();
        
        let certificateData = {
            type: type,
            studentName: ProgressTracker.userDatabase.name,
            studentClass: ProgressTracker.userDatabase.class,
            issueDate: date.toLocaleDateString('en-US'),
            certificateNumber: 'CERT-' + Date.now(),
            achievements: ProgressTracker.userDatabase.achievements.length,
            totalGames: stats.totalGamesPlayed,
            averageScore: Math.round(stats.averageScore)
        };
        
        if (subject) {
            certificateData.subject = subject;
            const subjectData = ProgressTracker.getSubjectProgress(subject);
            certificateData.subjectScore = Math.round(subjectData.averageScore);
        }
        
        return certificateData;
    },
    
    /**
     * Render Achievement Badge
     */
    renderAchievementBadge(achievement) {
        const badges = {
            'first_game': { icon: '🎮', color: '#667eea' },
            'game_streak_5': { icon: '🔥', color: '#f59e0b' },
            'game_streak_10': { icon: '⭐', color: '#fbbf24' },
            'perfect_score': { icon: '💯', color: '#10b981' },
            'high_scorer': { icon: '🏆', color: '#ec4899' },
            'consistency': { icon: '📚', color: '#3b82f6' },
            'subject_master': { icon: '🎓', color: '#8b5cf6' },
            'speedy': { icon: '⚡', color: '#06b6d4' }
        };
        
        const badgeData = badges[achievement.id] || { icon: '🌟', color: '#6366f1' };
        
        return `
            <div class="achievement-badge" style="background: linear-gradient(135deg, ${badgeData.color} 0%, ${badgeData.color}dd 100%);" title="${achievement.name}">
                <span class="badge-icon">${badgeData.icon}</span>
                <span class="badge-name">${achievement.name}</span>
                <span class="badge-date">${new Date(achievement.awardedDate).toLocaleDateString()}</span>
            </div>
        `;
    },
    
    /**
     * Render Certificate HTML
     */
    renderCertificateHTML(certificate) {
        return `
            <div class="certificate-container">
                <div class="certificate">
                    <div class="certificate-header">
                        <h1>🎓 CERTIFICATE OF ACHIEVEMENT</h1>
                    </div>
                    
                    <div class="certificate-body">
                        <p class="cert-text">This is to certify that</p>
                        <h2 class="student-name">${certificate.studentName}</h2>
                        <p class="cert-text">from Class ${certificate.studentClass}</p>
                        
                        <div class="achievement-details">
                            ${certificate.subject ? `
                                <p class="cert-text">has successfully demonstrated excellent performance in</p>
                                <h3>${certificate.subject}</h3>
                                <p class="score">Score: <strong>${certificate.subjectScore}%</strong></p>
                            ` : `
                                <p class="cert-text">has successfully completed</p>
                                <p class="achievement-stats">
                                    <span class="stat">${certificate.totalGames} Games</span> • 
                                    <span class="stat">${certificate.achievements} Achievements</span> • 
                                    <span class="stat">${certificate.averageScore}% Average</span>
                                </p>
                            `}
                        </div>
                        
                        <p class="cert-text inspire">Keep Learning, Keep Growing! 🚀</p>
                    </div>
                    
                    <div class="certificate-footer">
                        <p class="issue-date">Issued on: ${certificate.issueDate}</p>
                        <p class="cert-number">Certificate #: ${certificate.certificateNumber}</p>
                    </div>
                </div>
                
                <div class="certificate-actions">
                    <button class="cert-btn cert-download" onclick="AchievementSystem.downloadCertificate('${certificate.certificateNumber}')">
                        📥 Download
                    </button>
                    <button class="cert-btn cert-share" onclick="AchievementSystem.shareCertificate('${certificate.certificateNumber}')">
                        📤 Share
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Download Certificate as PDF
     */
    downloadCertificate(certificateNumber) {
        // Using html2pdf library (add to index.html)
        const element = document.querySelector('.certificate');
        const opt = {
            margin: 10,
            filename: `Certificate_${certificateNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        };
        
        alert('PDF download will work with html2pdf library installed');
        // html2pdf().set(opt).save();
    },
    
    /**
     * Share Certificate
     */
    shareCertificate(certificateNumber) {
        const stats = ProgressTracker.getPerformanceStats();
        const text = `🎉 I just earned a Certificate on EduQuest!\n📊 ${stats.totalGamesPlayed} Games Completed\n⭐ ${ProgressTracker.userDatabase.achievements.length} Achievements Unlocked\n🎓 Average Score: ${Math.round(stats.averageScore)}%\n\nJoin me and start learning today! 🚀`;
        
        if (navigator.share) {
            navigator.share({
                title: 'EduQuest Achievement',
                text: text
            });
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text);
            alert('Achievement copied to clipboard!');
        }
    },
    
    /**
     * Display Achievements Wall
     */
    displayAchievementsWall(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const achievements = this.getAllAchievements();
        
        if (achievements.length === 0) {
            container.innerHTML = `
                <div class="no-achievements">
                    <h3>🎯 No Achievements Yet</h3>
                    <p>Keep playing games to unlock badges and certificates!</p>
                    <a href="subjects.html" class="play-btn">Start Playing</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="achievements-grid">
                ${achievements.map(achievement => this.renderAchievementBadge(achievement)).join('')}
            </div>
        `;
    },
    
    /**
     * Display Progress Card
     */
    displayProgressCard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = ProgressTracker.getPerformanceStats();
        const progressPercentage = Math.round(stats.completionRate);
        
        container.innerHTML = `
            <div class="progress-card">
                <div class="progress-header">
                    <h3>📊 Your Progress</h3>
                    <span class="progress-percentage">${progressPercentage}%</span>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                
                <div class="progress-stats">
                    <div class="stat-item">
                        <span class="stat-icon">🎮</span>
                        <div class="stat-data">
                            <p class="stat-value">${stats.totalGamesPlayed}</p>
                            <p class="stat-label">Games Played</p>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <span class="stat-icon">⭐</span>
                        <div class="stat-data">
                            <p class="stat-value">${Math.round(stats.averageScore)}%</p>
                            <p class="stat-label">Average Score</p>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <span class="stat-icon">🏆</span>
                        <div class="stat-data">
                            <p class="stat-value">${ProgressTracker.userDatabase.achievements.length}</p>
                            <p class="stat-label">Achievements</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Display Subject Performance
     */
    displaySubjectPerformance(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = ProgressTracker.getPerformanceStats();
        const subjects = Object.values(stats.subjects);
        
        container.innerHTML = `
            <div class="subject-performance">
                <h3>📚 Subject-wise Performance</h3>
                <div class="subjects-list">
                    ${subjects.map(subject => `
                        <div class="subject-item">
                            <div class="subject-header">
                                <span class="subject-name">${subject.subject}</span>
                                <span class="subject-score">${Math.round(subject.averageScore)}%</span>
                            </div>
                            <div class="subject-bar">
                                <div class="subject-fill" style="width: ${subject.averageScore}%"></div>
                            </div>
                            <div class="subject-meta">
                                <small>${subject.gamesCompleted}/${subject.gamesPlayed} Completed</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

// CSS for Achievement System
const achievementStyles = `
    .achievement-badge {
        display: inline-block;
        padding: 1.5rem;
        border-radius: 16px;
        text-align: center;
        margin: 0.75rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 130px;
        animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .achievement-badge:hover {
        transform: translateY(-8px) scale(1.1);
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }
    
    .badge-icon {
        font-size: 2.5rem;
        display: block;
        margin-bottom: 0.5rem;
    }
    
    .badge-name {
        display: block;
        color: white;
        font-weight: 700;
        font-size: 0.95rem;
        margin-bottom: 0.3rem;
    }
    
    .badge-date {
        display: block;
        color: rgba(255,255,255,0.8);
        font-size: 0.75rem;
    }
    
    .certificate-container {
        text-align: center;
        padding: 2rem;
    }
    
    .certificate {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 3px solid #d97706;
        border-radius: 8px;
        padding: 3rem;
        max-width: 800px;
        margin: 2rem auto;
        box-shadow: 0 20px 50px rgba(217, 119, 6, 0.2);
        position: relative;
        overflow: hidden;
    }
    
    .certificate::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px);
        animation: shine 3s infinite;
    }
    
    @keyframes shine {
        0% { transform: translateX(0) translateY(0); }
        100% { transform: translateX(70px) translateY(70px); }
    }
    
    .certificate-header h1 {
        color: #d97706;
        font-size: 2.5rem;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    .certificate-body {
        position: relative;
        z-index: 1;
    }
    
    .cert-text {
        color: #92400e;
        font-size: 1.1rem;
        margin: 1rem 0;
        font-family: 'Georgia', serif;
    }
    
    .student-name {
        color: #d97706;
        font-size: 2rem;
        font-weight: 900;
        margin: 1.5rem 0;
        font-family: 'Georgia', serif;
        text-decoration: underline;
    }
    
    .achievement-stats {
        font-size: 1.2rem;
        color: #92400e;
        font-weight: 600;
        margin: 1.5rem 0;
    }
    
    .inspire {
        font-style: italic;
        font-size: 1.3rem;
        color: #d97706;
        font-weight: 700;
        margin-top: 2rem;
    }
    
    .certificate-footer {
        margin-top: 2rem;
        border-top: 2px solid #d97706;
        padding-top: 1rem;
    }
    
    .issue-date, .cert-number {
        color: #92400e;
        font-size: 0.9rem;
        margin: 0.5rem 0;
    }
    
    .certificate-actions {
        margin-top: 2rem;
    }
    
    .cert-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.8rem 2rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        margin: 0.5rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .cert-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    
    .progress-card {
        background: linear-gradient(135deg, var(--card-bg-light) 0%, var(--card-bg-light) 100%);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        animation: popIn 0.6s ease-out;
    }
    
    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    
    .progress-header h3 {
        color: var(--primary-color);
        margin: 0;
        font-size: 1.5rem;
    }
    
    .progress-percentage {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1.5rem;
        border-radius: 20px;
        font-weight: 700;
        font-size: 1.2rem;
    }
    
    .progress-bar {
        background: #e5e7eb;
        height: 12px;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 2rem;
    }
    
    .progress-fill {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        height: 100%;
        border-radius: 10px;
        transition: width 0.5s ease;
        animation: slideRight 0.6s ease-out;
    }
    
    .progress-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
    }
    
    .stat-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border-radius: 12px;
    }
    
    .stat-icon {
        font-size: 2rem;
    }
    
    .stat-value {
        font-size: 1.5rem;
        font-weight: 900;
        color: var(--primary-color);
        margin: 0;
    }
    
    .stat-label {
        font-size: 0.85rem;
        color: var(--text-color-secondary);
        margin: 0;
    }
    
    .subject-performance {
        background: linear-gradient(135deg, var(--card-bg-light) 0%, var(--card-bg-light) 100%);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }
    
    .subject-performance h3 {
        color: var(--primary-color);
        font-size: 1.3rem;
        margin-top: 0;
    }
    
    .subjects-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .subject-item {
        padding: 1rem;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        border-radius: 12px;
    }
    
    .subject-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }
    
    .subject-name {
        font-weight: 700;
        color: var(--primary-color);
    }
    
    .subject-score {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.9rem;
    }
    
    .subject-bar {
        background: #e5e7eb;
        height: 8px;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 0.5rem;
    }
    
    .subject-fill {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        height: 100%;
        border-radius: 8px;
        transition: width 0.5s ease;
    }
    
    .subject-meta {
        text-align: right;
        color: var(--text-color-secondary);
        font-size: 0.85rem;
    }
    
    .no-achievements {
        text-align: center;
        padding: 3rem 2rem;
    }
    
    .no-achievements h3 {
        color: var(--primary-color);
        font-size: 1.5rem;
    }
    
    .play-btn {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.8rem 2rem;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        margin-top: 1rem;
        transition: all 0.3s ease;
    }
    
    .play-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }
    
    @media (max-width: 768px) {
        .progress-stats {
            grid-template-columns: 1fr;
        }
        
        .certificate {
            padding: 1.5rem;
        }
        
        .student-name {
            font-size: 1.5rem;
        }
    }
`;

// Inject styles
if (!document.getElementById('achievement-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'achievement-styles';
    styleSheet.textContent = achievementStyles;
    document.head.appendChild(styleSheet);
}
