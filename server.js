const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const compression = require('compression');
require('dotenv').config(); // Load .env variables

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// ===================================================
// 1. MONGODB CONNECTION SETUP
// ===================================================

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/eduquest'; 

mongoose.connect(DB_URI)
    .then(() => {
        console.log('MongoDB successfully connected! 🟢');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    })
    .catch(err => {
        console.error("MongoDB connection error: ❌", err);
    });


// ===================================================
// 2. MIDDLEWARE & BODY PARSING
// ===================================================

app.use(cors());
app.use(compression()); // Enable gzip compression
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(express.static(__dirname));

// ===================================================
// 3. JWT AUTHENTICATION MIDDLEWARE
// ===================================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

// ===================================================
// 4. VALIDATION SCHEMAS (Joi)
// ===================================================

const signupSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50).required(),
    phone: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
    pincode: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

// RETURN CURRENT TEACHER (protected)
app.get('/api/teacher/me', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user && req.user.teacherId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        let teacher = await Teacher.findById(teacherId).lean();
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        // populate class names
        if (teacher.classes && teacher.classes.length) {
            const classDocs = await Class.find({ _id: { $in: teacher.classes } }).lean();
            teacher.classes = classDocs.map(c => ({ id: c._id, name: c.name }));
        }

        const { password, ...teacherData } = teacher;
        res.status(200).json({ message: 'Teacher fetched', teacher: teacherData });
    } catch (error) {
        console.error('GET /api/teacher/me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ADD STUDENT (teacher adds existing user as student by verifying student's password)
app.post('/api/teacher/students/add', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user && req.user.teacherId;
        const { email, password, rollNumber, dateOfBirth, parentName, parentEmail, parentPhone, dataCollectionConsent, classId } = req.body;

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
        if (!email || !password) return res.status(400).json({ message: 'Student email and password required' });

        // Find student user
        const studentUser = await User.findOne({ email });
        if (!studentUser) return res.status(404).json({ message: 'Student user not found' });

        // Verify student's password
        const isValid = await studentUser.comparePassword(password);
        if (!isValid) return res.status(401).json({ message: 'Invalid student credentials' });

        // Find teacher
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        // Prevent duplicate student
        const exists = teacher.students.find(s => s.email === email || s.id === String(studentUser._id));
        if (exists) return res.status(409).json({ message: 'Student already added' });

        // Add student entry (populate details from registered user if available)
        // Compute initial averageScore from user's subjectScores if present
        let avgScore = 0;
        try {
            if (studentUser.subjectScores && typeof studentUser.subjectScores === 'object') {
                const scores = Object.values(studentUser.subjectScores || {}).map(Number).filter(v => !isNaN(v));
                if (scores.length > 0) {
                    avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                }
            }
        } catch (e) {
            avgScore = 0;
        }

        const newStudent = {
            id: String(studentUser._id),
            name: studentUser.name || '',
            email: studentUser.email,
            phone: studentUser.phone || '',
            pincode: studentUser.pincode || '',
            rollNumber: rollNumber || '',
            dateOfBirth: dateOfBirth || '',
            classId: classId || null,
            progress: {
                gamesPlayed: 0,
                averageScore: avgScore,
                achievements: 0
            },
            parentContact: {
                name: parentName || '',
                email: parentEmail || '',
                phone: parentPhone || '',
                approved: false
            },
            privacyConsent: {
                dataCollection: !!dataCollectionConsent,
                parentMessaging: false,
                timestamp: new Date()
            }
        };

        teacher.students.push(newStudent);
        await teacher.save();

        // also register the student in a class document
        try {
            let targetClassId = null;
            if (classId) {
                targetClassId = classId;
            } else if (teacher.classes && teacher.classes.length > 0) {
                targetClassId = teacher.classes[0];
            }
            if (targetClassId) {
                const classDoc = await Class.findById(targetClassId);
                if (classDoc && !classDoc.students.includes(studentUser._id)) {
                    classDoc.students.push(studentUser._id);
                    await classDoc.save();
                }
            }
        } catch (clsErr) {
            console.error('Error adding student to class document:', clsErr);
        }

        const { password: pw, ...teacherData } = teacher.toObject();
        res.status(201).json({ message: 'Student added', student: newStudent, teacher: teacherData });
    } catch (error) {
        console.error('POST /api/teacher/students/add error:', error);
        res.status(500).json({ message: 'Server error while adding student' });
    }
});

// REMOVE STUDENT BY EMAIL
app.delete('/api/teacher/students/:email', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user && req.user.teacherId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
        const { email } = req.params;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        const beforeCount = teacher.students.length;
        teacher.students = teacher.students.filter(s => s.email !== email);
        await teacher.save();
        // also remove from classes
        if (teacher.classes && teacher.classes.length > 0) {
            await Class.updateMany({ _id: { $in: teacher.classes } }, { $pull: { students: email } });
        }
        const afterCount = teacher.students.length;
        res.status(200).json({ message: 'Student removed', removed: beforeCount - afterCount });
    } catch (error) {
        console.error('DELETE /api/teacher/students/:email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET CLASS DETAILS (including students) for teacher
app.get('/api/teacher/classes/:id', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user && req.user.teacherId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const cls = await Class.findById(id).lean();
        if (!cls) return res.status(404).json({ message: 'Class not found' });
        // ensure teacher owns it
        if (String(cls.teacher) !== String(teacherId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        // gather student details from teacher record for convenience
        const teacher = await Teacher.findById(teacherId).lean();
        let studentEntries = [];
        if (teacher && teacher.students && teacher.students.length) {
            studentEntries = teacher.students.filter(s => cls.students.map(String).includes(String(s.id)));
        }
        // if we also want to enrich with user lookup we could merge
        res.status(200).json({ class: { ...cls, students: studentEntries } });
    } catch (error) {
        console.error('GET /api/teacher/classes/:id error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// UPDATE STUDENT DETAILS (e.g., roll number, parent contact, consent)
app.patch('/api/teacher/students/:email', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user && req.user.teacherId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
        const { email } = req.params;
        const updates = req.body || {};
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        const student = teacher.students.find(s => s.email === email);
        if (!student) return res.status(404).json({ message: 'Student not associated with this teacher' });
        Object.assign(student, updates);
        await teacher.save();
        res.status(200).json({ message: 'Student updated', student });
    } catch (error) {
        console.error('PATCH /api/teacher/students/:email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50).required()
});

const updateScoreSchema = Joi.object({
    email: Joi.string().email().required(),
    points: Joi.number().integer().min(1).max(10000).required(),
    subject: Joi.string().optional()
});

const redeemSchema = Joi.object({
    email: Joi.string().email().required(),
    productName: Joi.string().min(2).max(100).required(),
    cost: Joi.number().integer().min(1).max(100000).required(),
    deliveryInfo: Joi.object({
        fullName: Joi.string().min(2).max(100).required(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
        streetAddress: Joi.string().min(5).max(200).required(),
        city: Joi.string().min(2).max(50).required(),
        pincode: Joi.string().pattern(/^[0-9]{6}$/).required()
    }).required()
});


// ===================================================
// 5. MONGOOSE SCHEMA DEFINITION (User & Redemption Models)
// ===================================================

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Will be hashed
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, // NEW: Role-based access
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    
    subjectScores: {
        type: Map,
        of: Number,
        default: {} 
    },
    
    customNotes: {
        type: Map, 
        of: {
            type: Map, 
            of: [
                {
                    id: { type: Number, required: true },
                    type: { type: String, default: 'User PDF' },
                    title: String,
                    desc: String,
                    file: String
                }
            ]
        }
    },
    
    lastQuizDifficulty: { type: String, default: 'Easy' }, // NEW: Track last quiz difficulty
    lastQuizScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        // Only hash if it's not already hashed (doesn't start with $2a or $2b)
        if (!this.password.startsWith('$2a') && !this.password.startsWith('$2b')) {
            const salt = await bcryptjs.genSalt(10);
            this.password = await bcryptjs.hash(this.password, salt);
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcryptjs.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

const User = mongoose.model('User', UserSchema);

// ===================================================
// TEACHER SCHEMA (For teacher portal)
// ===================================================
// class model used by teachers to group students and assignments
const ClassSchema = new mongoose.Schema({
    name: { type: String, required: true },          // e.g. "Class 1A" or "Grade 2"
    grade: { type: String },                         // optional grade/category
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});
const Class = mongoose.model('Class', ClassSchema);

// run a one-time migration for teachers that have legacy `class` field but no `classes` array
async function migrateTeacherClasses() {
    try {
        const teachers = await Teacher.find({ classes: { $exists: true, $size: 0 }, class: { $exists: true, $ne: '' } });
        for (const t of teachers) {
            try {
                const cls = new Class({ name: t.class, grade: t.class, teacher: t._id, students: [] });
                await cls.save();
                t.classes = [cls._id];
                await t.save();
                console.log('Migrated teacher to class:', t.email);
            } catch (err) {
                console.error('Error migrating teacher', t.email, err);
            }
        }
    } catch (err) {
        console.error('Migration error:', err);
    }
}

migrateTeacherClasses();

const TeacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Will be hashed
    school: { type: String, required: true },
    // legacy field kept for simple lookups; new code should prefer classes array
    class: { type: String, required: true },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    students: [
        {
            id: String,
            name: String,
            email: String,
            rollNumber: String,
            dateOfBirth: String,
            progress: {
                gamesPlayed: { type: Number, default: 0 },
                averageScore: { type: Number, default: 0 },
                achievements: { type: Number, default: 0 }
            },
            parentContact: {
                name: String,
                email: String,
                phone: String,
                approved: { type: Boolean, default: false }
            },
            privacyConsent: {
                dataCollection: { type: Boolean, default: false },
                parentMessaging: { type: Boolean, default: false },
                timestamp: Date
            }
        }
    ],
    privacySettings: {
        dataCollection: { type: Boolean, default: true },
        parentMessaging: { type: Boolean, default: true },
        auditLogging: { type: Boolean, default: true },
        gdprCompliance: { type: Boolean, default: true },
        roleBasedAccess: { type: Boolean, default: true },
        consentManagement: { type: Boolean, default: true },
        dataEncryption: { type: Boolean, default: true },
        activityLogging: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving teacher
TeacherSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        if (!this.password.startsWith('$2a') && !this.password.startsWith('$2b')) {
            const salt = await bcryptjs.genSalt(10);
            this.password = await bcryptjs.hash(this.password, salt);
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for teacher
TeacherSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcryptjs.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

const Teacher = mongoose.model('Teacher', TeacherSchema);

// ===================================================
// ASSIGNMENT SCHEMA
// ===================================================
const AssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    subject: { type: String, default: 'general' },
    type: { type: String, default: 'homework' },
    dueDate: { type: String },
    dueTime: { type: String, default: '23:59' },
    instructions: { type: String },
    maxScore: { type: Number, default: 100 },
    difficulty: { type: String, default: 'medium' },
    resources: { type: Array, default: [] },
    assignedTo: { type: String, default: 'class' }, // class, group, individual
    studentEmails: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'draft' },
    publishedAt: { type: Date }
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', AssignmentSchema);

// ===================================================
// GAME SESSION SCHEMA
// ===================================================
const GameSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: String,
    gameName: String,
    subject: String,
    difficulty: String,
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    durationSeconds: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const GameSession = mongoose.model('GameSession', GameSessionSchema);

// *** UPDATED REDEMPTION LOG SCHEMA WITH INVENTORY ***
const RedemptionLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    cost: { type: Number, required: true },
    redemptionDate: { type: Date, default: Date.now },
    deliveryStatus: { type: String, enum: ['Pending', 'Shipped', 'Delivered'], default: 'Pending' },
    deliveryInfo: {
        fullName: String,
        phone: String,
        streetAddress: String,
        city: String,
        pincode: String,
    },
    trackingId: { type: String, unique: true, sparse: true } // For shipment tracking
});

const RedemptionLog = mongoose.model('RedemptionLog', RedemptionLogSchema);

// *** NEW NOTIFICATION SCHEMA ***
const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['shipment', 'level_unlock', 'reward'], default: 'reward' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedData: mongoose.Schema.Types.Mixed, // For storing order IDs, level info, etc.
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
});

const Notification = mongoose.model('Notification', NotificationSchema);

// *** REWARDS INVENTORY SCHEMA ***
const RewardsSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    productName: { type: String, required: true },
    cost: { type: Number, required: true },
    description: String,
    imageUrl: String,
    stock: { type: Number, default: 100 }, // NEW: Track inventory
    createdAt: { type: Date, default: Date.now }
});

const Rewards = mongoose.model('Rewards', RewardsSchema);


// ===================================================
// 6. API ENDPOINTS (SECURITY ENHANCED)
// ===================================================

// SIGNUP (With password hashing & validation)
app.post('/api/signup', async (req, res) => {
    try {
        const { error, value } = signupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password, phone, pincode } = value;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'This email is already registered.' });
        }
        
        // Create new user (password will be hashed by schema pre-save hook)
        const newUser = new User({ 
            name, 
            email, 
            password,
            phone,
            pincode,
            points: 0, 
            subjectScores: {}, 
            customNotes: {} 
        });
        await newUser.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('New user signed up:', newUser.email);
        const { password: _, ...userData } = newUser.toObject();
        res.status(201).json({ 
            message: 'Registration successful!',
            user: userData,
            token: token
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// LOGIN (With password verification & JWT token)
app.post('/api/login', async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = value;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        
        // Compare password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`User logged in: ${user.email}`);
        const { password: _, ...userData } = user.toObject();
        res.status(200).json({ 
            message: 'Login successful!', 
            user: userData,
            token: token
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================================================
// TEACHER AUTHENTICATION ENDPOINTS
// ===================================================

// TEACHER SIGNUP
app.post('/api/teacher/signup', async (req, res) => {
    try {
        const { name, email, school, class: classVal, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !school || !classVal || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one uppercase letter.' });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one number.' });
        }

        // Check if email already exists
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(409).json({ message: 'This email is already registered as a teacher.' });
        }

        // Create new teacher (password will be hashed by schema pre-save hook)
        const newTeacher = new Teacher({
            name,
            email,
            school,
            class: classVal,
            classes: [],
            password,
            students: [],
            privacySettings: {
                dataCollection: true,
                parentMessaging: true,
                auditLogging: true,
                gdprCompliance: true,
                roleBasedAccess: true,
                consentManagement: true,
                dataEncryption: true,
                activityLogging: true
            }
        });

        // save teacher first so we have an _id to reference in class document
        await newTeacher.save();

        // create default class for the teacher
        try {
            const defaultClass = new Class({
                name: classVal,
                grade: classVal,
                teacher: newTeacher._id,
                students: []
            });
            await defaultClass.save();
            newTeacher.classes.push(defaultClass._id);
            await newTeacher.save();
        } catch (clsErr) {
            console.error('Error creating default class for teacher:', clsErr);
            // continue, teacher account exists even if class creation fails
        }

        // Generate JWT token
        const token = jwt.sign(
            { teacherId: newTeacher._id, email: newTeacher.email, role: 'teacher' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('New teacher registered:', newTeacher.email);
        const { password: _, ...teacherData } = newTeacher.toObject();
        res.status(201).json({
            message: 'Teacher account created successfully!',
            teacher: teacherData,
            token: token
        });
    } catch (error) {
        console.error("Teacher signup error:", error);
        res.status(500).json({ message: 'Server error during teacher registration.' });
    }
});

// TEACHER LOGIN
app.post('/api/teacher/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find teacher by email
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare password
        const isPasswordValid = await teacher.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { teacherId: teacher._id, email: teacher.email, role: 'teacher' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`Teacher logged in: ${teacher.email}`);
        const { password: _, ...teacherData } = teacher.toObject();
        res.status(200).json({
            message: 'Login successful!',
            teacher: teacherData,
            token: token
        });
    } catch (error) {
        console.error("Teacher login error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// SOCIAL AUTH (With password hashing)
app.post('/api/social-auth', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({ message: 'Missing email or name for social authentication.' });
        }
        
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user with hashed placeholder password
            user = new User({ 
                name: name, 
                email: email, 
                password: bcryptjs.hashSync('SOCIAL_LOGIN_' + Date.now(), 10),
                points: 500,
                subjectScores: {},
                customNotes: {}
            });
            await user.save();
            console.log('New social user signed up:', user.email);
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userData } = user.toObject();
        res.status(200).json({ 
            message: 'Social login successful!', 
            user: userData,
            token: token
        });

    } catch (error) {
        console.error("Social Auth error:", error);
        res.status(500).json({ message: 'Server error during social authentication.' });
    }
});

// GET USER DATA (Protected route with JWT)
app.get('/api/user-data', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (user) {
            const { password, ...userData } = user.toObject();
            res.status(200).json({ user: userData });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error("User data fetch error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE SCORE (Protected route with JWT & validation)
app.post('/api/update-score', authenticateToken, async (req, res) => {
    try {
        const { error, value } = updateScoreSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, points, subject } = value;
        const pointsToAdd = parseInt(points);
        
        const updateOperation = { $inc: { points: pointsToAdd }, updatedAt: new Date() };

        if (subject && subject.length > 0) {
            const subjectPath = `subjectScores.${subject}`;
            updateOperation.$inc[subjectPath] = pointsToAdd;
        }

        const result = await User.findOneAndUpdate(
            { email }, 
            updateOperation, 
            { new: true }
        );

        if (result) {
            console.log(`Score updated for ${result.name}. New score: ${result.points}`);
            res.status(200).json({ message: 'Score updated!', newScore: result.points });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error("Update score error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// LEADERBOARD
app.get('/api/leaderboard', async (req, res) => {
    const { subject } = req.query;

    try {
        let sortCriteria;
        let selectFields = 'name points level -_id';

        if (subject && subject !== 'all') {
            sortCriteria = { [`subjectScores.${subject}`]: -1 };
            selectFields = `name subjectScores.${subject} level`;
        } else {
            sortCriteria = { points: -1 };
            selectFields = 'name points level';
        }

        const topUsers = await User.find({})
            .sort(sortCriteria)
            .limit(10)
            .select(selectFields);
        
        const formattedUsers = topUsers.map(user => {
            const userObj = user.toObject();
            if (subject && subject !== 'all') {
                const score = userObj.subjectScores ? (userObj.subjectScores[subject] || 0) : 0;
                return { name: userObj.name, points: score, level: userObj.level };
            }
            return { name: userObj.name, points: userObj.points, level: userObj.level };
        });

        res.status(200).json({ leaderboard: formattedUsers });
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET USER CUSTOM NOTES
app.get('/api/user-notes', authenticateToken, async (req, res) => {
    const { classId, subjectId } = req.query;
    
    try {
        const user = await User.findOne({ email: req.user.email }).select('customNotes');
        
        let notes = [];
        if (user && user.customNotes.get(classId) && user.customNotes.get(classId).get(subjectId)) {
            notes = user.customNotes.get(classId).get(subjectId);
        }
        
        res.status(200).json({ notes: notes || [] });
    } catch (error) {
        console.error("Fetch notes error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================================================
// ASSIGNMENTS API
// ===================================================

// Teacher fetch student data by email (teacher-only)
app.get('/api/teacher/student', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Student email required' });

        const student = await User.findOne({ email }).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const { password, ...studentData } = student;
        res.status(200).json({ student: studentData });
    } catch (error) {
        console.error('GET /api/teacher/student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Teacher class-level statistics for dashboard
app.get('/api/teacher/class-stats', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const teacherId = req.user.teacherId;
        const teacher = await Teacher.findById(teacherId).lean();
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        // optionally restrict to a specific class
        let studentIds = [];
        const { classId } = req.query;
        if (classId) {
            const cls = await Class.findById(classId).lean();
            if (cls && cls.students && cls.students.length) {
                studentIds = cls.students.map(id => mongoose.Types.ObjectId(id));
            }
        }
        if (studentIds.length === 0) {
            studentIds = (teacher.students || []).map(s => mongoose.Types.ObjectId(s.id));
        }

        const sessionAgg = await GameSession.aggregate([
            { $match: { userId: { $in: studentIds } } },
            { $group: { _id: null, totalSessions: { $sum: 1 }, avgScore: { $avg: '$score' }, totalScore: { $sum: '$score' } } }
        ]);
        const sessionStats = sessionAgg[0] || { totalSessions: 0, avgScore: 0, totalScore: 0 };

        // heatmap by date for last 30 days
        const heatmapAgg = await GameSession.aggregate([
            { $match: { userId: { $in: studentIds } } },
            { $project: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
            { $group: { _id: "$date", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const sessionHeatmap = heatmapAgg.map(h => ({ date: h._id, count: h.count }));

        const assignmentAgg = await Assignment.aggregate([
            { $match: { createdBy: mongoose.Types.ObjectId(teacherId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const assignmentStats = {};
        assignmentAgg.forEach(a => {
            assignmentStats[a._id] = a.count;
        });

        res.status(200).json({
            studentsCount: studentIds.length,
            sessionStats,
            sessionHeatmap,
            assignmentStats
        });
    } catch (error) {
        console.error('GET /api/teacher/class-stats error:', error);
        res.status(500).json({ message: 'Server error while fetching class statistics' });
    }
});

// Create assignment (teacher only)
app.post('/api/assignments', authenticateToken, async (req, res) => {
    try {
        // Allow only teachers to create assignments
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can create assignments.' });
        }

        const teacherId = req.user.teacherId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        const {
            title, description, subject, type, dueDate, dueTime,
            instructions, maxScore, difficulty, resources, assignedTo, studentEmails
        } = req.body;

        if (!title || !dueDate) return res.status(400).json({ message: 'Title and dueDate required' });

        const assignment = new Assignment({
            title,
            description,
            subject,
            type,
            dueDate,
            dueTime,
            instructions,
            maxScore,
            difficulty,
            resources: resources || [],
            assignedTo: assignedTo || 'class',
            studentEmails: studentEmails || [],
            createdBy: teacherId,
            status: 'active',
            publishedAt: new Date()
        });

        await assignment.save();

        // Optional: create notifications for listed student emails
        if (assignment.studentEmails && assignment.studentEmails.length) {
            for (const email of assignment.studentEmails) {
                const user = await User.findOne({ email });
                if (user) {
                    const note = new Notification({
                        userId: user._id,
                        type: 'assignment',
                        title: `New assignment: ${assignment.title}`,
                        message: assignment.description || 'New assignment published',
                        relatedData: { assignmentId: assignment._id }
                    });
                    await note.save();
                }
            }
        }

        res.status(201).json({ message: 'Assignment created', assignment });
    } catch (error) {
        console.error('POST /api/assignments error:', error);
        res.status(500).json({ message: 'Server error creating assignment' });
    }
});

// Get assignments for current user (teacher gets their assignments; student gets assignments assigned to them or to their class teachers)
app.get('/api/assignments', authenticateToken, async (req, res) => {
    try {
        // If requester is teacher, return assignments created by them
        if (req.user.role === 'teacher') {
            const teacherId = req.user.teacherId;
            const list = await Assignment.find({ createdBy: teacherId }).sort({ createdAt: -1 }).lean();
            return res.status(200).json({ assignments: list });
        }

        // For students/users: return assignments where studentEmails contains their email
        const userEmail = req.user.email;
        const userId = req.user.userId || null;

        // Find teachers that have this student in their roster (match by userId)
        const teachersWithStudent = await Teacher.find({ 'students.id': String(userId) }).select('_id').lean();
        const teacherIds = teachersWithStudent.map(t => t._id);

        const assignments = await Assignment.find({
            $or: [
                { studentEmails: userEmail },
                { createdBy: { $in: teacherIds }, assignedTo: 'class' }
            ]
        }).sort({ createdAt: -1 }).lean();

        res.status(200).json({ assignments });
    } catch (error) {
        console.error('GET /api/assignments error:', error);
        res.status(500).json({ message: 'Server error fetching assignments' });
    }
});


// Update assignment (teacher only)
app.patch('/api/assignments/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can update assignments.' });
        }
        const teacherId = req.user.teacherId;
        const { id } = req.params;
        const updates = req.body || {};
        const assignment = await Assignment.findById(id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (String(assignment.createdBy) !== String(teacherId)) {
            return res.status(403).json({ message: 'Not allowed to edit this assignment' });
        }
        Object.assign(assignment, updates);
        await assignment.save();
        res.status(200).json({ message: 'Assignment updated', assignment });
    } catch (error) {
        console.error('PATCH /api/assignments/:id error:', error);
        res.status(500).json({ message: 'Server error updating assignment' });
    }
});

// Delete assignment
app.delete('/api/assignments/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can delete assignments.' });
        }
        const teacherId = req.user.teacherId;
        const { id } = req.params;
        const assignment = await Assignment.findById(id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (String(assignment.createdBy) !== String(teacherId)) {
            return res.status(403).json({ message: 'Not allowed to delete this assignment' });
        }
        await Assignment.deleteOne({ _id: id });
        res.status(200).json({ message: 'Assignment deleted' });
    } catch (error) {
        console.error('DELETE /api/assignments/:id error:', error);
        res.status(500).json({ message: 'Server error deleting assignment' });
    }
});

// ===================================================
// GAME SESSIONS / PROGRESS ENDPOINTS
// ===================================================

// Record a game session for the authenticated user (student) or teacher can record for a student via /api/users/:id/game-sessions
app.post('/api/me/game-sessions', authenticateToken, async (req, res) => {
    try {
        const payload = req.body || {};
        const userId = req.user.userId;
        if (!userId) return res.status(401).json({ message: 'User context required' });

        const { gameId, gameName, subject, difficulty, score = 0, maxScore = 100, durationSeconds = 0, correct = 0, incorrect = 0, metadata = {} } = payload;

        const session = new GameSession({ userId, gameId, gameName, subject, difficulty, score, maxScore, durationSeconds, correct, incorrect, metadata });
        await session.save();

        // Update user aggregates: increment points and subjectScores
        const incUpdate = { $inc: { points: Math.round(score), updatedAt: new Date() } };
        // increment subject cumulative score
        if (subject) {
            incUpdate.$inc[`subjectScores.${subject}`] = Math.round(score);
        }

        await User.findByIdAndUpdate(userId, incUpdate, { new: true });

        res.status(201).json({ message: 'Session recorded', sessionId: session._id });
    } catch (error) {
        console.error('POST /api/me/game-sessions error:', error);
        res.status(500).json({ message: 'Server error recording session' });
    }
});

// Teacher or admin can post a session for a specific user
app.post('/api/users/:userId/game-sessions', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        // allow teacher role to create sessions for students
        if (req.user.role !== 'teacher' && (!req.user.userId || String(req.user.userId) !== String(userId))) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { gameId, gameName, subject, difficulty, score = 0, maxScore = 100, durationSeconds = 0, correct = 0, incorrect = 0, metadata = {} } = req.body || {};

        const session = new GameSession({ userId, gameId, gameName, subject, difficulty, score, maxScore, durationSeconds, correct, incorrect, metadata });
        await session.save();

        const incUpdate = { $inc: { points: Math.round(score), updatedAt: new Date() } };
        if (subject) incUpdate.$inc[`subjectScores.${subject}`] = Math.round(score);
        await User.findByIdAndUpdate(userId, incUpdate, { new: true });

        res.status(201).json({ message: 'Session recorded for user', sessionId: session._id });
    } catch (error) {
        console.error('POST /api/users/:userId/game-sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get aggregated progress for the authenticated user
app.get('/api/me/progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) return res.status(401).json({ message: 'User context required' });

        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const recentSessions = await GameSession.find({ userId }).sort({ createdAt: -1 }).limit(20).lean();
        const totalGames = await GameSession.countDocuments({ userId });

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                points: user.points || 0,
                subjectScores: user.subjectScores || {},
                totalGamesPlayed: totalGames
            },
            recentSessions
        });
    } catch (error) {
        console.error('GET /api/me/progress error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get sessions for a specific user (teacher only or owner)
app.get('/api/users/:userId/game-sessions', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit || '20', 10);

        // allow teacher to fetch if they have the student, or the user themselves
        if (req.user.role === 'teacher') {
            // assume teachers can fetch; further validation could check teacher.students
        } else if (req.user.userId && String(req.user.userId) !== String(userId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const sessions = await GameSession.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
        res.status(200).json({ sessions });
    } catch (error) {
        console.error('GET /api/users/:userId/game-sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// SAVE CUSTOM PDF NOTE
app.post('/api/save-note', authenticateToken, async (req, res) => {
    const { classId, subjectId, title, desc, filePath } = req.body;

    if (!classId || !subjectId || !title || !filePath) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newNote = {
        id: Date.now(),
        type: 'User PDF',
        title: title,
        desc: desc,
        file: filePath
    };
    
    try {
        const updatePath = `customNotes.${classId}.${subjectId}`;

        const result = await User.findOneAndUpdate(
            { email: req.user.email },
            { $push: { [updatePath]: newNote } },
            { new: true, upsert: true, runValidators: true }
        );

        if (result) {
            res.status(201).json({ message: "Note saved successfully!", newNote: newNote });
        } else {
            res.status(404).json({ message: "User not found." });
        }
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ message: "Server error while saving note." });
    }
});

// DELETE CUSTOM NOTE
app.post('/api/delete-note', authenticateToken, async (req, res) => {
    const { classId, subjectId, noteId } = req.body;
    const noteIdInt = parseInt(noteId);
    
    try {
        const updatePath = `customNotes.${classId}.${subjectId}`;

        const result = await User.findOneAndUpdate(
            { email: req.user.email },
            { $pull: { [updatePath]: { id: noteIdInt } } },
            { new: true }
        );

        if (result) {
            res.status(200).json({ message: "Note deleted successfully." });
        } else {
            res.status(404).json({ message: "User not found." });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: "Server error while deleting note." });
    }
});


// REDEEM PRODUCT (Protected route with validation)
app.post('/api/redeem-product', authenticateToken, async (req, res) => {
    try {
        const { error, value } = redeemSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, productName, cost, deliveryInfo } = value;
        const pointsToDeduct = -parseInt(cost);

        // Check user has enough points
        const userResult = await User.findOneAndUpdate(
            { email, points: { $gte: cost } }, 
            { $inc: { points: pointsToDeduct }, updatedAt: new Date() }, 
            { new: true }
        );

        if (!userResult) {
            return res.status(400).json({ message: 'Insufficient coins or user not found.' });
        }

        // Check product stock
        const product = await Rewards.findOne({ productName });
        if (!product || product.stock <= 0) {
            // Refund the points
            await User.findByIdAndUpdate(userResult._id, { $inc: { points: -pointsToDeduct } });
            return res.status(400).json({ message: 'Product out of stock.' });
        }

        // Create tracking ID
        const trackingId = 'TRK' + Date.now() + Math.random().toString(36).substr(2, 9);

        // Log the redemption
        const newLog = new RedemptionLog({
            userId: userResult._id, 
            productName: productName,
            cost: cost,
            deliveryInfo: deliveryInfo,
            trackingStatus: 'Pending',
            trackingId: trackingId
        });
        await newLog.save();

        // Decrease stock
        await Rewards.findByIdAndUpdate(product._id, { $inc: { stock: -1 } });

        // Create notification
        const notification = new Notification({
            userId: userResult._id,
            type: 'reward',
            title: 'Redemption Confirmed',
            message: `Your order for ${productName} has been confirmed. Tracking ID: ${trackingId}`,
            relatedData: { orderId: newLog._id, trackingId: trackingId }
        });
        await notification.save();

        console.log(`Product redeemed by ${userResult.name}: ${productName}`);
        res.status(200).json({ 
            message: 'Redemption successful!', 
            newScore: userResult.points,
            trackingId: trackingId,
            logId: newLog._id
        });
    } catch (error) {
        console.error("Redeem product error:", error);
        res.status(500).json({ message: 'Server error during redemption.' });
    }
});

// ===================================================
// 7. ADMIN ENDPOINTS (WITH ROLE-BASED ACCESS)
// ===================================================

// Middleware to check admin role
const checkAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

// GET ALL REDEMPTION LOGS (Admin only)
app.get('/api/admin/redemption-log', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const logs = await RedemptionLog.find({})
            .populate('userId', 'name email')
            .sort({ redemptionDate: -1 });

        const formattedLogs = logs.map(log => ({
            orderId: log._id,
            userName: log.userId.name,
            userEmail: log.userId.email,
            product: log.productName,
            cost: log.cost,
            date: log.redemptionDate.toISOString().split('T')[0],
            status: log.deliveryStatus,
            trackingId: log.trackingId,
            deliveryDetails: log.deliveryInfo
        }));

        res.status(200).json({ redemptionLogs: formattedLogs });
    } catch (error) {
        console.error("Fetch redemption log error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE DELIVERY STATUS (Admin only)
app.post('/api/admin/update-delivery-status', authenticateToken, checkAdmin, async (req, res) => {
    const { orderId, newStatus, trackingId } = req.body;

    if (!['Pending', 'Shipped', 'Delivered'].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid delivery status.' });
    }

    try {
        const updatedLog = await RedemptionLog.findByIdAndUpdate(
            orderId,
            { deliveryStatus: newStatus, trackingId: trackingId, updatedAt: new Date() },
            { new: true }
        ).populate('userId', '_id name');

        if (!updatedLog) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Create notification for user
        const notification = new Notification({
            userId: updatedLog.userId._id,
            type: 'shipment',
            title: `Order ${newStatus}`,
            message: `Your order for ${updatedLog.productName} has been ${newStatus.toLowerCase()}. Tracking ID: ${trackingId}`,
            relatedData: { orderId: updatedLog._id, trackingId: trackingId }
        });
        await notification.save();

        console.log(`Delivery status updated for order ${orderId} to ${newStatus}`);
        res.status(200).json({ message: 'Status updated successfully!', updatedLog });
    } catch (error) {
        console.error("Update delivery status error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET REWARDS/PRODUCTS INVENTORY (Admin only)
app.get('/api/admin/rewards', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const rewards = await Rewards.find({}).sort({ createdAt: -1 });
        res.status(200).json({ rewards });
    } catch (error) {
        console.error("Fetch rewards error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE PRODUCT STOCK (Admin only)
app.post('/api/admin/update-stock', authenticateToken, checkAdmin, async (req, res) => {
    const { productId, newStock } = req.body;

    if (!productId || newStock < 0) {
        return res.status(400).json({ message: 'Invalid product ID or stock value.' });
    }

    try {
        const updatedProduct = await Rewards.findByIdAndUpdate(
            productId,
            { stock: newStock },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        console.log(`Stock updated for ${updatedProduct.productName} to ${newStock}`);
        res.status(200).json({ message: 'Stock updated successfully!', product: updatedProduct });
    } catch (error) {
        console.error("Update stock error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ADD NEW PRODUCT TO REWARDS (Admin only)
app.post('/api/admin/add-reward', authenticateToken, checkAdmin, async (req, res) => {
    const { productName, cost, stock, description } = req.body;

    if (!productName || !cost || stock === undefined) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const newProduct = new Rewards({
            productId: 'PROD_' + Date.now(),
            productName,
            cost: parseInt(cost),
            description: description || '',
            stock: parseInt(stock)
        });

        await newProduct.save();
        console.log(`New product added: ${productName}`);
        res.status(201).json({ message: 'Product added successfully!', product: newProduct });
    } catch (error) {
        console.error("Add product error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================================================
// 8. NOTIFICATION ENDPOINTS
// ===================================================

// GET USER NOTIFICATIONS
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({ notifications });
    } catch (error) {
        console.error("Fetch notifications error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// MARK NOTIFICATION AS READ
app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found.' });
        }

        res.status(200).json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error("Mark read error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================================================
// 9. ADAPTIVE QUIZ ENDPOINTS
// ===================================================

// GET RECOMMENDED NEXT QUIZ
app.post('/api/quiz/suggest-next', authenticateToken, async (req, res) => {
    const { score, totalQuestions, subject } = req.body;

    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const percentageScore = (score / totalQuestions) * 100;
        let suggestedDifficulty = 'Easy';
        let timerSeconds = 60;

        if (percentageScore > 90) {
            suggestedDifficulty = 'Challenge Level';
            timerSeconds = 45;
        } else if (percentageScore > 75) {
            suggestedDifficulty = 'Intermediate';
            timerSeconds = 50;
        }

        // Update user's last quiz info
        await User.findOneAndUpdate(
            { email: req.user.email },
            { lastQuizDifficulty: suggestedDifficulty, lastQuizScore: score }
        );

        res.status(200).json({
            suggestedDifficulty,
            timerSeconds,
            percentageScore,
            message: `Great job! Try the ${suggestedDifficulty} level next.`
        });
    } catch (error) {
        console.error("Suggest quiz error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ===================================================
// 10. ROUTE SERVING
// ===================================================

// Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});