/**
 * PARENT MESSAGING SYSTEM
 * Secure communication between teachers and parents
 */

const ParentMessaging = {
    currentTeacherId: null,
    allTeachers: [],
    messages: [],
    notifications: [],

    /**
     * Initialize Parent Messaging
     */
    init() {
        const teacherData = localStorage.getItem('currentTeacher');
        if (teacherData) {
            this.currentTeacherId = JSON.parse(teacherData).id;
        }
        this.loadAllTeachers();
        this.loadMessages();
        this.loadNotifications();
    },

    /**
     * Load all teachers
     */
    loadAllTeachers() {
        this.allTeachers = JSON.parse(localStorage.getItem('eduquestTeachers') || '[]');
    },

    /**
     * Load messages
     */
    loadMessages() {
        const messages = localStorage.getItem('parentMessages');
        this.messages = messages ? JSON.parse(messages) : [];
    },

    /**
     * Load notifications
     */
    loadNotifications() {
        const notifs = localStorage.getItem('parentNotifications');
        this.notifications = notifs ? JSON.parse(notifs) : [];
    },

    /**
     * Send message to parent
     */
    sendMessageToParent(studentId, parentEmail, subject, messageBody) {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        if (!teacher) return { success: false, message: 'Teacher not found' };

        const student = teacher.students.find(s => s.id === studentId);
        if (!student) return { success: false, message: 'Student not found' };

        // Check privacy consent
        if (!student.privacyConsent.parentMessaging) {
            return { success: false, message: 'Parent messaging not consented for this student' };
        }

        const message = {
            id: 'msg_' + Date.now(),
            fromTeacherId: this.currentTeacherId,
            fromTeacherName: teacher.name,
            toParentEmail: parentEmail,
            toParentName: student.parentContact.name,
            studentId: studentId,
            studentName: student.name,
            subject: subject,
            body: messageBody,
            sentAt: new Date().toISOString(),
            read: false,
            readAt: null,
            encrypted: false,
            attachment: null,
            importance: 'normal', // low, normal, high
            type: 'message' // message, notification, alert
        };

        this.messages.push(message);
        this.saveMessages();

        // Create notification for parent
        this.createNotification(parentEmail, {
            type: 'new_message',
            from: teacher.name,
            subject: subject,
            studentName: student.name,
            messageId: message.id
        });

        // Log activity
        PrivacyManager.logActivity('MESSAGE_SENT', {
            fromTeacher: teacher.name,
            toParent: parentEmail,
            studentId: studentId,
            messageId: message.id
        });

        return { success: true, messageId: message.id };
    },

    /**
     * Send bulk message to all parents in class
     */
    sendBulkMessage(subject, messageBody, targetAudience = 'all') {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        if (!teacher) return { success: false };

        let students = teacher.students;
        
        if (targetAudience === 'active') {
            students = students.filter(s => s.progress.gamesPlayed > 0);
        } else if (targetAudience === 'inactive') {
            students = students.filter(s => s.progress.gamesPlayed === 0);
        }

        const results = [];
        students.forEach(student => {
            if (student.parentContact.email && student.privacyConsent.parentMessaging) {
                const result = this.sendMessageToParent(
                    student.id,
                    student.parentContact.email,
                    subject,
                    messageBody
                );
                results.push({
                    studentName: student.name,
                    parentEmail: student.parentContact.email,
                    sent: result.success
                });
            }
        });

        PrivacyManager.logActivity('BULK_MESSAGE_SENT', {
            recipientCount: results.filter(r => r.sent).length,
            targetAudience: targetAudience
        });

        return { success: true, results: results };
    },

    /**
     * Send progress update to parent
     */
    sendProgressUpdate(studentId) {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        if (!teacher) return { success: false };

        const student = teacher.students.find(s => s.id === studentId);
        if (!student) return { success: false };

        const progressData = {
            studentName: student.name,
            gamesPlayed: student.progress.gamesPlayed,
            averageScore: student.progress.averageScore,
            achievements: student.progress.achievements,
            lastActive: student.lastActive || 'Never',
            performanceRating: this.calculatePerformanceRating(student.progress.averageScore),
            recommendation: this.generateRecommendation(student)
        };

        const subject = `Progress Update: ${student.name}`;
        const messageBody = this.generateProgressReport(progressData);

        return this.sendMessageToParent(studentId, student.parentContact.email, subject, messageBody);
    },

    /**
     * Calculate performance rating
     */
    calculatePerformanceRating(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Needs Improvement';
    },

    /**
     * Generate recommendation based on student progress
     */
    generateRecommendation(student) {
        const score = student.progress.averageScore;
        
        if (score >= 80) {
            return 'Student is performing excellently. Encourage to take more challenging games.';
        } else if (score >= 60) {
            return 'Student is doing well. Continue encouraging regular practice.';
        } else if (score >= 40) {
            return 'Student needs support. Consider additional practice sessions.';
        } else {
            return 'Student requires immediate attention. Please schedule a meeting with the teacher.';
        }
    },

    /**
     * Generate progress report text
     */
    generateProgressReport(progressData) {
        return `
Dear Parent/Guardian,

This is a progress update for ${progressData.studentName}.

**Performance Summary:**
- Games Played: ${progressData.gamesPlayed}
- Average Score: ${progressData.averageScore}%
- Achievements Unlocked: ${progressData.achievements}
- Last Active: ${progressData.lastActive}
- Performance Rating: ${progressData.performanceRating}

**Recommendation:**
${progressData.recommendation}

Please feel free to reach out if you have any questions.

Best regards,
Your Child's Teacher
        `;
    },

    /**
     * Create notification
     */
    createNotification(parentEmail, data) {
        const notification = {
            id: 'notif_' + Date.now(),
            parentEmail: parentEmail,
            type: data.type,
            from: data.from,
            subject: data.subject,
            studentName: data.studentName,
            messageId: data.messageId,
            createdAt: new Date().toISOString(),
            read: false,
            readAt: null
        };

        this.notifications.push(notification);
        this.saveNotifications();
    },

    /**
     * Get parent's messages
     */
    getParentMessages(parentEmail) {
        return this.messages.filter(m => m.toParentEmail === parentEmail);
    },

    /**
     * Get unread message count for parent
     */
    getUnreadCount(parentEmail) {
        return this.messages.filter(m => m.toParentEmail === parentEmail && !m.read).length;
    },

    /**
     * Mark message as read
     */
    markAsRead(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            message.readAt = new Date().toISOString();
            this.saveMessages();
            return { success: true };
        }
        return { success: false };
    },

    /**
     * Schedule message for later
     */
    scheduleMessage(studentId, parentEmail, subject, messageBody, scheduledTime) {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        if (!teacher) return { success: false };

        const scheduledMessage = {
            id: 'scheduled_' + Date.now(),
            fromTeacherId: this.currentTeacherId,
            studentId: studentId,
            toParentEmail: parentEmail,
            subject: subject,
            body: messageBody,
            scheduledTime: scheduledTime,
            status: 'pending', // pending, sent, failed
            createdAt: new Date().toISOString()
        };

        const scheduled = JSON.parse(localStorage.getItem('scheduledMessages') || '[]');
        scheduled.push(scheduledMessage);
        localStorage.setItem('scheduledMessages', JSON.stringify(scheduled));

        PrivacyManager.logActivity('MESSAGE_SCHEDULED', {
            messageId: scheduledMessage.id,
            scheduledTime: scheduledTime
        });

        return { success: true, scheduledMessageId: scheduledMessage.id };
    },

    /**
     * Create announcement for all parents
     */
    createAnnouncement(title, content, priority = 'normal') {
        const announcement = {
            id: 'announcement_' + Date.now(),
            fromTeacherId: this.currentTeacherId,
            title: title,
            content: content,
            priority: priority, // low, normal, high, urgent
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            readBy: []
        };

        const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
        announcements.push(announcement);
        localStorage.setItem('announcements', JSON.stringify(announcements));

        PrivacyManager.logActivity('ANNOUNCEMENT_CREATED', {
            announcementId: announcement.id,
            title: title,
            priority: priority
        });

        return { success: true, announcementId: announcement.id };
    },

    /**
     * Get parent contact preferences
     */
    getParentPreferences(parentEmail) {
        const preferences = {
            parentEmail: parentEmail,
            communicationChannel: 'email', // email, sms, app
            frequency: 'weekly', // daily, weekly, biweekly, monthly
            preferredTime: '19:00', // HH:MM format
            receiveAnnouncements: true,
            receiveProgressUpdates: true,
            receiveUrgentAlerts: true,
            language: 'hindi' // hindi, english, local language
        };

        // Load from storage if exists
        const stored = localStorage.getItem(`parentPreferences_${parentEmail}`);
        if (stored) {
            return JSON.parse(stored);
        }

        return preferences;
    },

    /**
     * Update parent preferences
     */
    updateParentPreferences(parentEmail, preferences) {
        localStorage.setItem(`parentPreferences_${parentEmail}`, JSON.stringify(preferences));
        return { success: true };
    },

    /**
     * Get message history between teacher and parent
     */
    getConversationHistory(parentEmail, studentId = null) {
        let history = this.messages.filter(m => m.toParentEmail === parentEmail);
        
        if (studentId) {
            history = history.filter(m => m.studentId === studentId);
        }

        return history.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    },

    /**
     * Generate communication report for parent
     */
    generateCommunicationReport(parentEmail) {
        const messages = this.getParentMessages(parentEmail);
        const readMessages = messages.filter(m => m.read);
        
        return {
            parentEmail: parentEmail,
            totalMessages: messages.length,
            readMessages: readMessages.length,
            unreadMessages: messages.length - readMessages.length,
            lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
            messagesByStudent: this.groupMessagesByStudent(messages),
            averageResponseTime: this.calculateAverageResponseTime(messages)
        };
    },

    /**
     * Group messages by student
     */
    groupMessagesByStudent(messages) {
        const grouped = {};
        messages.forEach(msg => {
            if (!grouped[msg.studentId]) {
                grouped[msg.studentId] = {
                    studentName: msg.studentName,
                    count: 0,
                    unread: 0
                };
            }
            grouped[msg.studentId].count++;
            if (!msg.read) grouped[msg.studentId].unread++;
        });
        return grouped;
    },

    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(messages) {
        if (messages.length === 0) return 'N/A';
        
        const readMessages = messages.filter(m => m.read && m.readAt);
        if (readMessages.length === 0) return 'N/A';

        const totalTime = readMessages.reduce((sum, msg) => {
            const sent = new Date(msg.sentAt);
            const read = new Date(msg.readAt);
            return sum + (read - sent);
        }, 0);

        const avgHours = (totalTime / readMessages.length) / (1000 * 60 * 60);
        return avgHours.toFixed(1) + ' hours';
    },

    /**
     * Delete message (archive)
     */
    deleteMessage(messageId) {
        const messageIndex = this.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            const message = this.messages[messageIndex];
            message.deletedAt = new Date().toISOString();
            this.saveMessages();
            return { success: true };
        }
        return { success: false };
    },

    /**
     * Create message template
     */
    createTemplate(name, subject, body, category) {
        const template = {
            id: 'template_' + Date.now(),
            name: name,
            subject: subject,
            body: body,
            category: category, // progress, behavior, attendance, general
            createdBy: this.currentTeacherId,
            createdAt: new Date().toISOString()
        };

        const templates = JSON.parse(localStorage.getItem('messageTemplates') || '[]');
        templates.push(template);
        localStorage.setItem('messageTemplates', JSON.stringify(templates));

        return { success: true, templateId: template.id };
    },

    /**
     * Get message templates
     */
    getTemplates(category = null) {
        const templates = JSON.parse(localStorage.getItem('messageTemplates') || '[]');
        
        if (category) {
            return templates.filter(t => t.category === category);
        }
        
        return templates;
    },

    /**
     * Send message from template
     */
    sendFromTemplate(studentId, parentEmail, templateId, customizations = {}) {
        const templates = this.getTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) return { success: false, message: 'Template not found' };

        let subject = template.subject;
        let body = template.body;

        // Apply customizations
        Object.keys(customizations).forEach(key => {
            subject = subject.replace(`{${key}}`, customizations[key]);
            body = body.replace(`{${key}}`, customizations[key]);
        });

        return this.sendMessageToParent(studentId, parentEmail, subject, body);
    },

    /**
     * Save messages
     */
    saveMessages() {
        localStorage.setItem('parentMessages', JSON.stringify(this.messages));
    },

    /**
     * Save notifications
     */
    saveNotifications() {
        localStorage.setItem('parentNotifications', JSON.stringify(this.notifications));
    }
};

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    ParentMessaging.init();
});
