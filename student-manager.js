/**
 * STUDENT MANAGEMENT SYSTEM
 * Manages student data, enrollment, and details
 */

const StudentManager = {
    currentTeacherId: null,
    currentTeacher: null,
    allTeachers: [],

    /**
     * Initialize student manager
     */
    init() {
        const teacherData = localStorage.getItem('currentTeacher');
        if (!teacherData) {
            window.location.href = 'teacher-auth.html';
            return;
        }

        this.currentTeacher = JSON.parse(teacherData);
        this.currentTeacherId = this.currentTeacher.id;
        this.loadAllTeachers();
    },

    /**
     * Load all teachers data
     */
    loadAllTeachers() {
        this.allTeachers = JSON.parse(localStorage.getItem('eduquestTeachers') || '[]');
    },

    /**
     * Get current teacher's students
     */
    getMyStudents() {
        const teacher = this.allTeachers.find(t => t.id === this.currentTeacherId);
        return teacher?.students || [];
    },

    /**
     * Add new student
     */
    addStudent(studentData) {
        // Validate student data
        if (!this.validateStudentData(studentData)) {
            return { success: false, message: 'Invalid student data' };
        }

        // Create student object
        const newStudent = {
            id: 'student_' + Date.now(),
            ...studentData,
            enrollmentDate: new Date().toISOString(),
            progress: {
                gamesPlayed: 0,
                averageScore: 0,
                achievements: 0
            },
            parentContact: {
                name: studentData.parentName || '',
                email: studentData.parentEmail || '',
                phone: studentData.parentPhone || '',
                approved: false
            },
            privacyConsent: {
                dataCollection: studentData.dataCollectionConsent || false,
                parentMessaging: studentData.parentMessagingConsent || false,
                timestamp: new Date().toISOString()
            }
        };

        // Add to teacher's students
        const teacherIndex = this.allTeachers.findIndex(t => t.id === this.currentTeacherId);
        if (teacherIndex !== -1) {
            this.allTeachers[teacherIndex].students.push(newStudent);
            localStorage.setItem('eduquestTeachers', JSON.stringify(this.allTeachers));

            // Log activity for privacy audit
            PrivacyManager.logActivity('STUDENT_ADDED', {
                studentId: newStudent.id,
                studentName: studentData.name,
                details: `Student added by teacher`
            });

            return { success: true, student: newStudent };
        }

        return { success: false, message: 'Teacher not found' };
    },

    /**
     * Validate student data
     */
    validateStudentData(data) {
        const required = ['name', 'email', 'rollNumber', 'dateOfBirth'];
        return required.every(field => data[field] && data[field].trim() !== '');
    },

    /**
     * Update student
     */
    async updateStudent(studentId, updatedData) {
        const teacherIndex = this.allTeachers.findIndex(t => t.id === this.currentTeacherId);
        if (teacherIndex === -1) return { success: false };

        const studentIndex = this.allTeachers[teacherIndex].students.findIndex(s => s.id === studentId);
        if (studentIndex === -1) return { success: false };

        const oldData = { ...this.allTeachers[teacherIndex].students[studentIndex] };
        const merged = {
            ...oldData,
            ...updatedData,
            lastModified: new Date().toISOString()
        };

        // attempt server update if email present
        if (merged.email) {
            try {
                const token = localStorage.getItem('teacherToken');
                const res = await fetch(`/api/teacher/students/${encodeURIComponent(merged.email)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify(updatedData)
                });
                if (res.ok) {
                    const payload = await res.json();
                    merged = payload.student || merged;
                }
            } catch (err) {
                console.warn('Server update of student failed', err);
            }
        }

        this.allTeachers[teacherIndex].students[studentIndex] = merged;
        localStorage.setItem('eduquestTeachers', JSON.stringify(this.allTeachers));

        PrivacyManager.logActivity('STUDENT_UPDATED', {
            studentId: studentId,
            changes: Object.keys(updatedData)
        });

        return { success: true };
    },


    /**
     * Delete student (GDPR compliance)
     */
    deleteStudent(studentId) {
        const teacherIndex = this.allTeachers.findIndex(t => t.id === this.currentTeacherId);
        if (teacherIndex === -1) return { success: false };

        const studentName = this.allTeachers[teacherIndex].students.find(s => s.id === studentId)?.name;

        this.allTeachers[teacherIndex].students = this.allTeachers[teacherIndex].students.filter(s => s.id !== studentId);
        localStorage.setItem('eduquestTeachers', JSON.stringify(this.allTeachers));

        PrivacyManager.logActivity('STUDENT_DELETED', {
            studentId: studentId,
            studentName: studentName,
            details: 'Student record deleted (GDPR compliant)'
        });

        return { success: true };
    },

    /**
     * Get student by ID
     */
    getStudent(studentId) {
        const students = this.getMyStudents();
        return students.find(s => s.id === studentId);
    },

    /**
     * Get student progress
     */
    getStudentProgress(studentId) {
        const student = this.getStudent(studentId);
        if (!student) return null;

        return {
            studentName: student.name,
            gamesPlayed: student.progress.gamesPlayed,
            averageScore: student.progress.averageScore,
            achievements: student.progress.achievements,
            enrollmentDate: student.enrollmentDate,
            lastActive: student.lastActive || 'Never',
            subjects: {
                math: { attempted: 0, passed: 0, average: 0 },
                english: { attempted: 0, passed: 0, average: 0 },
                hindi: { attempted: 0, passed: 0, average: 0 },
                evs: { attempted: 0, passed: 0, average: 0 }
            }
        };
    },

    /**
     * Search students
     */
    searchStudents(query) {
        const students = this.getMyStudents();
        const lowerQuery = query.toLowerCase();
        
        return students.filter(student => 
            student.name.toLowerCase().includes(lowerQuery) ||
            student.email.toLowerCase().includes(lowerQuery) ||
            student.rollNumber.includes(query)
        );
    },

    /**
     * Bulk import students
     */
    bulkImportStudents(studentArray) {
        const results = [];
        
        studentArray.forEach(studentData => {
            const result = this.addStudent(studentData);
            results.push({
                name: studentData.name,
                success: result.success,
                message: result.message
            });
        });

        PrivacyManager.logActivity('BULK_IMPORT', {
            count: results.length,
            successful: results.filter(r => r.success).length
        });

        return results;
    },

    /**
     * Export student list (with privacy settings)
     */
    exportStudents(format = 'json', includePrivate = false) {
        const students = this.getMyStudents();
        
        const exportData = students.map(student => ({
            name: student.name,
            rollNumber: student.rollNumber,
            email: includePrivate ? student.email : 'hidden',
            progress: student.progress,
            enrollmentDate: student.enrollmentDate
        }));

        if (format === 'csv') {
            return this.convertToCSV(exportData);
        }

        return JSON.stringify(exportData, null, 2);
    },

    /**
     * Convert to CSV
     */
    convertToCSV(data) {
        if (!data || !data.length) return '';
        
        const keys = Object.keys(data[0]);
        const csv = [keys.join(',')];
        
        data.forEach(item => {
            csv.push(keys.map(key => JSON.stringify(item[key])).join(','));
        });
        
        return csv.join('\n');
    },

    /**
     * Get class statistics
     */
    getClassStatistics(classId = null) {
        let students = this.getMyStudents();
        if (classId) {
            students = students.filter(s => s.classId === classId);
        }
        
        if (students.length === 0) {
            return {
                totalStudents: 0,
                averageScore: 0,
                totalGamesPlayed: 0,
                totalAchievements: 0,
                topPerformers: [],
                needsAttention: []
            };
        }

        const stats = {
            totalStudents: students.length,
            averageScore: students.reduce((sum, s) => sum + s.progress.averageScore, 0) / students.length,
            totalGamesPlayed: students.reduce((sum, s) => sum + s.progress.gamesPlayed, 0),
            totalAchievements: students.reduce((sum, s) => sum + s.progress.achievements, 0),
            topPerformers: [...students].sort((a, b) => b.progress.averageScore - a.progress.averageScore).slice(0, 5),
            needsAttention: [...students].filter(s => s.progress.averageScore < 60).sort((a, b) => a.progress.averageScore - b.progress.averageScore)
        };

        return stats;
    },


    /**
     * Update student progress (from games/quizzes)
     */
    updateStudentProgress(studentId, progressData) {
        const student = this.getStudent(studentId);
        if (!student) return { success: false };

        const oldProgress = { ...student.progress };

        student.progress.gamesPlayed = progressData.gamesPlayed || student.progress.gamesPlayed;
        student.progress.averageScore = progressData.averageScore || student.progress.averageScore;
        student.progress.achievements = progressData.achievements || student.progress.achievements;
        student.lastActive = new Date().toISOString();

        this.updateStudent(studentId, {
            progress: student.progress,
            lastActive: student.lastActive
        });

        return { success: true };
    }
};

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    StudentManager.init();
});
