/**
 * ASSIGNMENT MANAGER
 * Create, manage, and grade student assignments
 */

const AssignmentManager = {
    currentTeacherId: null,
    allTeachers: [],
    assignments: [],
    submissions: [],

    /**
     * Initialize Assignment Manager
     */
    async init() {
        const teacherData = localStorage.getItem('currentTeacher');
        if (teacherData) {
            this.currentTeacherId = JSON.parse(teacherData).id;
        }
        this.loadAllTeachers();
        await this.fetchAssignments();
        this.loadSubmissions();
    },

    /**
     * Load all teachers
     */
    loadAllTeachers() {
        this.allTeachers = JSON.parse(localStorage.getItem('eduquestTeachers') || '[]');
    },

    /**
     * Load assignments
     */
    // deprecated: local storage kept for backwards compatibility
    loadAssignments() {
        const assignments = localStorage.getItem('assignments');
        this.assignments = assignments ? JSON.parse(assignments) : [];
    },

    /**
     * Load submissions
     */
    loadSubmissions() {
        const submissions = localStorage.getItem('submissions');
        this.submissions = submissions ? JSON.parse(submissions) : [];
    },

    // fetch assignments from server and store locally
    async fetchAssignments() {
        try {
            const token = localStorage.getItem('teacherToken');
            const res = await fetch('/api/assignments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            if (res.ok && Array.isArray(result.assignments)) {
                this.assignments = result.assignments;
                this.saveAssignments();
            } else {
                console.warn('Failed to load assignments from server', result.message);
            }
        } catch (err) {
            console.error('Network error fetching assignments', err);
        }
    },


    /**
     * Create new assignment
     */
    createAssignment(assignmentData) {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        if (!teacher) return { success: false, message: 'Teacher not found' };

        if (!this.validateAssignmentData(assignmentData)) {
            return { success: false, message: 'Invalid assignment data' };
        }

        const assignment = {
            id: 'assignment_' + Date.now(),
            createdBy: this.currentTeacherId,
            createdByName: teacher.name,
            title: assignmentData.title,
            description: assignmentData.description,
            subject: assignmentData.subject, // math, english, hindi, evs
            type: assignmentData.type, // homework, project, quiz, practice
            dueDate: assignmentData.dueDate,
            dueTime: assignmentData.dueTime || '23:59',
            instructions: assignmentData.instructions,
            maxScore: assignmentData.maxScore || 100,
            difficulty: assignmentData.difficulty || 'medium', // easy, medium, hard
            resources: assignmentData.resources || [], // links, files, videos
            assignedTo: assignmentData.assignedTo || 'class', // class, group, individual
            studentIds: assignmentData.studentIds || [],
            createdAt: new Date().toISOString(),
            status: 'active', // active, closed, draft
            submissions: [],
            publishedAt: null
        };

        // send to server
        try {
            const token = localStorage.getItem('teacherToken');
            const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(assignmentData)
            });
            const result = await res.json();
            if (!res.ok) {
                return { success: false, message: result.message || 'Server error' };
            }
            // push to local list
            this.assignments.unshift(result.assignment);

            // notify parents via existing mechanism (server also creates notifications)
            const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
            if (assignmentData.assignedTo === 'class' && teacher.students) {
                teacher.students.forEach(student => {
                    ParentMessaging.createNotification(student.parentContact.email, {
                        type: 'new_assignment',
                        from: teacher.name,
                        subject: `New Assignment: ${assignmentData.title}`,
                        studentName: student.name,
                        messageId: result.assignment._id
                    });
                });
            }
            PrivacyManager.logActivity('ASSIGNMENT_CREATED', {
                assignmentId: result.assignment._id,
                title: assignmentData.title,
                assignedTo: assignmentData.assignedTo
            });
            return { success: true, assignmentId: result.assignment._id };
        } catch (err) {
            console.error('Error creating assignment:', err);
            return { success: false, message: 'Network error' };
        }
    },

    /**
     * Validate assignment data
     */
    validateAssignmentData(data) {
        const required = ['title', 'description', 'subject', 'type', 'dueDate'];
        return required.every(field => data[field] && data[field].trim() !== '');
    },

    /**
     * Get all assignments for teacher
     */
    getMyAssignments() {
        return this.assignments.filter(a => a.createdBy === this.currentTeacherId);
    },

    /**
     * Get assignment by ID
     */
    getAssignment(assignmentId) {
        return this.assignments.find(a => a.id === assignmentId || a._id === assignmentId);
    },

    /**
     * Update assignment
     */
    async updateAssignment(assignmentId, updates) {
        try {
            const token = localStorage.getItem('teacherToken');
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            const result = await res.json();
            if (!res.ok) {
                return { success: false, message: result.message || 'Server error' };
            }
            // update local copy
            const assignment = this.getAssignment(assignmentId);
            if (assignment) Object.assign(assignment, result.assignment);
            this.saveAssignments();
            PrivacyManager.logActivity('ASSIGNMENT_UPDATED', {
                assignmentId: assignmentId,
                changes: Object.keys(updates)
            });
            return { success: true };
        } catch (err) {
            console.error('Error updating assignment:', err);
            return { success: false, message: 'Network error' };
        }
    },

    /**
     * Delete assignment
     */
    async deleteAssignment(assignmentId) {
        try {
            const token = localStorage.getItem('teacherToken');
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) {
                return { success: false, message: result.message || 'Server error' };
            }
            const index = this.assignments.findIndex(a => a._id === assignmentId || a.id === assignmentId);
            if (index !== -1) this.assignments.splice(index, 1);
            this.saveAssignments();
            PrivacyManager.logActivity('ASSIGNMENT_DELETED', {
                assignmentId: assignmentId
            });
            return { success: true };
        } catch (err) {
            console.error('Error deleting assignment:', err);
            return { success: false, message: 'Network error' };
        }
    },

    /**
     * Publish assignment
     */
    publishAssignment(assignmentId) {
        const assignment = this.getAssignment(assignmentId);
        if (!assignment) return { success: false };

        assignment.status = 'active';
        assignment.publishedAt = new Date().toISOString();
        this.saveAssignments();

        return { success: true };
    },

    /**
     * Close assignment (no more submissions)
     */
    closeAssignment(assignmentId) {
        const assignment = this.getAssignment(assignmentId);
        if (!assignment) return { success: false };

        assignment.status = 'closed';
        assignment.closedAt = new Date().toISOString();
        this.saveAssignments();

        PrivacyManager.logActivity('ASSIGNMENT_CLOSED', {
            assignmentId: assignmentId
        });

        return { success: true };
    },

    /**
     * Submit assignment
     */
    submitAssignment(assignmentId, studentId, submissionData) {
        const assignment = this.getAssignment(assignmentId);
        if (!assignment) return { success: false, message: 'Assignment not found' };

        // Check if assignment is still open
        const dueDateTime = new Date(`${assignment.dueDate}T${assignment.dueTime}`);
        const isLate = new Date() > dueDateTime;

        const submission = {
            id: 'submission_' + Date.now(),
            assignmentId: assignmentId,
            studentId: studentId,
            submittedAt: new Date().toISOString(),
            isLate: isLate,
            submissionContent: submissionData.content || '',
            attachments: submissionData.attachments || [],
            status: 'submitted', // submitted, graded, late
            score: null,
            feedback: null,
            gradedBy: null,
            gradedAt: null
        };

        this.submissions.push(submission);
        assignment.submissions.push({
            studentId: studentId,
            submissionId: submission.id,
            submittedAt: submission.submittedAt,
            isLate: submission.isLate
        });

        this.saveSubmissions();
        this.saveAssignments();

        PrivacyManager.logActivity('ASSIGNMENT_SUBMITTED', {
            assignmentId: assignmentId,
            studentId: studentId,
            isLate: isLate
        });

        return { success: true, submissionId: submission.id };
    },

    /**
     * Get submission by ID
     */
    getSubmission(submissionId) {
        return this.submissions.find(s => s.id === submissionId);
    },

    /**
     * Grade submission
     */
    gradeSubmission(submissionId, score, feedback) {
        const submission = this.getSubmission(submissionId);
        if (!submission) return { success: false };

        const assignment = this.getAssignment(submission.assignmentId);
        if (score < 0 || score > assignment.maxScore) {
            return { success: false, message: `Score must be between 0 and ${assignment.maxScore}` };
        }

        submission.score = score;
        submission.feedback = feedback;
        submission.status = 'graded';
        submission.gradedBy = this.currentTeacherId;
        submission.gradedAt = new Date().toISOString();

        this.saveSubmissions();

        PrivacyManager.logActivity('ASSIGNMENT_GRADED', {
            submissionId: submissionId,
            score: score,
            maxScore: assignment.maxScore
        });

        return { success: true };
    },

    /**
     * Get submissions for assignment
     */
    getAssignmentSubmissions(assignmentId) {
        return this.submissions.filter(s => s.assignmentId === assignmentId);
    },

    /**
     * Get student's submissions
     */
    getStudentSubmissions(studentId) {
        return this.submissions.filter(s => s.studentId === studentId);
    },

    /**
     * Get submission statistics
     */
    getSubmissionStats(assignmentId) {
        const submissions = this.getAssignmentSubmissions(assignmentId);
        const assignment = this.getAssignment(assignmentId);
        
        if (!assignment) return null;

        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        const totalStudents = teacher?.students?.length || 0;

        const stats = {
            assignmentId: assignmentId,
            totalAssigned: totalStudents,
            submitted: submissions.length,
            pending: totalStudents - submissions.length,
            onTime: submissions.filter(s => !s.isLate).length,
            late: submissions.filter(s => s.isLate).length,
            graded: submissions.filter(s => s.status === 'graded').length,
            ungraded: submissions.filter(s => s.status === 'submitted').length,
            averageScore: this.calculateAverageScore(submissions, assignment.maxScore),
            submissionRate: ((submissions.length / totalStudents) * 100).toFixed(1) + '%'
        };

        return stats;
    },

    /**
     * Calculate average score
     */
    calculateAverageScore(submissions, maxScore) {
        const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== null);
        if (gradedSubmissions.length === 0) return 0;

        const total = gradedSubmissions.reduce((sum, s) => sum + s.score, 0);
        const average = total / gradedSubmissions.length;
        return (average / maxScore * 100).toFixed(1);
    },

    /**
     * Add assignment resource
     */
    addResource(assignmentId, resourceData) {
        const assignment = this.getAssignment(assignmentId);
        if (!assignment) return { success: false };

        const resource = {
            id: 'resource_' + Date.now(),
            type: resourceData.type, // link, file, video, document
            title: resourceData.title,
            url: resourceData.url,
            description: resourceData.description,
            addedAt: new Date().toISOString()
        };

        assignment.resources.push(resource);
        this.saveAssignments();

        return { success: true, resourceId: resource.id };
    },

    /**
     * Get assignments due soon
     */
    getUpcomingAssignments(daysAhead = 7) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        return this.getMyAssignments().filter(a => {
            const dueDate = new Date(a.dueDate);
            return dueDate >= today && dueDate <= futureDate && a.status === 'active';
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },

    /**
     * Get overdue assignments
     */
    getOverdueAssignments() {
        const now = new Date();

        return this.getMyAssignments().filter(a => {
            const dueDateTime = new Date(`${a.dueDate}T${a.dueTime}`);
            return dueDateTime < now && a.status === 'active';
        });
    },

    /**
     * Generate assignment report
     */
    generateAssignmentReport(assignmentId) {
        const assignment = this.getAssignment(assignmentId);
        if (!assignment) return null;

        const stats = this.getSubmissionStats(assignmentId);
        const submissions = this.getAssignmentSubmissions(assignmentId);
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);

        const submissionDetails = submissions.map(sub => {
            const student = teacher?.students?.find(s => s.id === sub.studentId);
            return {
                studentName: student?.name || 'Unknown',
                submittedAt: sub.submittedAt,
                isLate: sub.isLate,
                score: sub.score,
                feedback: sub.feedback,
                status: sub.status
            };
        });

        return {
            assignment: {
                id: assignment.id,
                title: assignment.title,
                dueDate: assignment.dueDate,
                maxScore: assignment.maxScore
            },
            stats: stats,
            submissions: submissionDetails,
            generatedAt: new Date().toISOString()
        };
    },

    /**
     * Export assignment data
     */
    exportAssignmentData(assignmentId, format = 'json') {
        const report = this.generateAssignmentReport(assignmentId);
        if (!report) return null;

        if (format === 'csv') {
            return this.convertReportToCSV(report);
        }

        return JSON.stringify(report, null, 2);
    },

    /**
     * Convert report to CSV
     */
    convertReportToCSV(report) {
        let csv = `Assignment: ${report.assignment.title}\n`;
        csv += `Due Date: ${report.assignment.dueDate}\n\n`;
        csv += `Student Name,Submitted At,Late,Score,Status\n`;

        report.submissions.forEach(sub => {
            csv += `"${sub.studentName}","${sub.submittedAt}","${sub.isLate ? 'Yes' : 'No'}","${sub.score}","${sub.status}"\n`;
        });

        return csv;
    },

    /**
     * Create assignment from template
     */
    createFromTemplate(templateId, customizations = {}) {
        const templates = JSON.parse(localStorage.getItem('assignmentTemplates') || '[]');
        const template = templates.find(t => t.id === templateId);

        if (!template) return { success: false, message: 'Template not found' };

        const assignmentData = {
            ...template,
            title: customizations.title || template.title,
            dueDate: customizations.dueDate || template.dueDate,
            assignedTo: customizations.assignedTo || template.assignedTo
        };

        return this.createAssignment(assignmentData);
    },

    /**
     * Save assignments
     */
    saveAssignments() {
        localStorage.setItem('assignments', JSON.stringify(this.assignments));
    },

    /**
     * Save submissions
     */
    saveSubmissions() {
        localStorage.setItem('submissions', JSON.stringify(this.submissions));
    }
};

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    AssignmentManager.init();
});
