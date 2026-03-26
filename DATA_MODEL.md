# EduQuest Data Model

## User (collection: users)
- name: String
- email: String (unique)
- password: hashed
- role: user | admin (default=user)
- points: Number
- level: Number
- subjectScores: Map<String, Number>
- customNotes: Map<classId, Map<subjectId, Array<note>>> (note has id, type, title, desc, file)
- lastQuizDifficulty, lastQuizScore
- timestamps

### Instance methods
- `comparePassword(candidate)` checks bcrypt

## Teacher (collection: teachers)
- name, email, password, school, class
- classes: [Class._id]
- students: array of embedded student snapshot data
- privacySettings: dataCollection, parentMessaging, etc.
- timestamps

## Class (collection: classes)
- name, grade
- teacher: @Teacher
- students: [User._id]

## Assignment
- title, description, subject, type, dueDate/time, instructions
- maxScore, difficulty, resources
- assignedTo, studentEmails
- createdBy: Teacher
- status, publishedAt

## GameSession
- userId: User
- gameId, gameName, subject, difficulty
- score, maxScore
- durationSeconds, correct, incorrect
- metadata
- timestamps

## Rewards
- productId, productName
- cost, description, imageUrl
- stock
- createdAt

## RedemptionLog
- userId: User
- productName, cost, deliveryStatus
- deliveryInfo + trackingId

## Notification
- userId: User
- type: shipment|level_unlock|reward
- title, message, isRead
- relatedData, expiresAt

## Validation
- Joi schemas in `server.js`: signup, login, updateScore, redeem

## Security
- JWT_SECRET controls `authenticateToken`
- Hashing: bcryptjs with salt
