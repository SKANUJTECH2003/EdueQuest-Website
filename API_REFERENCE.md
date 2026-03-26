# EduQuest API Reference

## Auth
- `POST /api/signup`
- `POST /api/login`
- `POST /api/social-auth`

### Example: Signup
Request:
```bash
curl -X POST http://localhost:3000/api/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ravi","email":"ravi@example.com","password":"Secret123","phone":"9998887776","pincode":"560001"}'
```
Response:
```json
{ "message": "Registration successful!", "token": "<jwt>", "user": { "name": "Ravi", "email": "ravi@example.com", "points": 0 }
}
```

### Example: Login
Request:
```bash
curl -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ravi@example.com","password":"Secret123"}'
```
Response:
```json
{ "message": "Login successful!", "token": "<jwt>", "user": { "email": "ravi@example.com", "role": "user", "points": 0 } }
```

## Protected user (JWT)
- `GET /api/user-data`
- `POST /api/update-score`
- `GET /api/leaderboard?subject=<subject|all>`
- `GET /api/user-notes?classId=<>&subjectId=<>`
- `POST /api/save-note`
- `POST /api/delete-note`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/me/game-sessions`
- `GET /api/me/progress`

### Example: Get user data
Request:
```bash
curl -H "Authorization: Bearer <jwt>" http://localhost:3000/api/user-data
```
Response:
```json
{ "user": { "name": "Ravi", "email": "ravi@example.com", "points": 10, "subjectScores": {"math": 20} } }
```

### Example: Update score
Request:
```bash
curl -X POST http://localhost:3000/api/update-score \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <jwt>' \
  -d '{"email":"ravi@example.com","points":50,"subject":"math"}'
```
Response:
```json
{ "message": "Score updated!", "newScore": 60 }
```

## Teacher (role-based)
- `POST /api/teacher/signup`
- `POST /api/teacher/login`
- `GET /api/teacher/me`
- `POST /api/teacher/students/add`
- `DELETE /api/teacher/students/:email`
- `PATCH /api/teacher/students/:email`
- `GET /api/teacher/classes/:id`
- `GET /api/teacher/student?email=<>`
- `GET /api/teacher/class-stats?classId=<>`

### Example: Teacher signup
Request:
```bash
curl -X POST http://localhost:3000/api/teacher/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Priya","email":"priya@school.com","school":"Oak Public","class":"Class 2","password":"Teach1234"}'
```
Response:
```json
{ "message": "Teacher account created successfully!", "token": "<jwt>", "teacher": { "name": "Priya", "email": "priya@school.com" } }
```

## Assignments
- `POST /api/assignments`
- `GET /api/assignments`
- `PATCH /api/assignments/:id`
- `DELETE /api/assignments/:id`

## Rewards
- `POST /api/redeem-product`

## Admin
- `GET /api/admin/redemption-log`
- `POST /api/admin/update-delivery-status`
- `GET /api/admin/rewards`
- `POST /api/admin/update-stock`
- `POST /api/admin/add-reward`

## Quiz
- `POST /api/quiz/suggest-next`

## Game sessions
- `POST /api/users/:userId/game-sessions`
- `GET /api/users/:userId/game-sessions`

## Data models and request fields
Refer to `DATA_MODEL.md` for shape and validation.

## Error handling
- 400: validation fail
- 401: token missing / invalid / unauthorized
- 403: forbidden role
- 404: not found
- 500: server error

## QuickStart cURL examples (student + teacher)

### Student flow
1. Signup
2. Login
3. Update score

```bash
curl -X POST http://localhost:3000/api/signup -H 'Content-Type: application/json' -d '{"name":"Ravi","email":"ravi@example.com","password":"Secret123","phone":"9998887776","pincode":"560001"}'

curl -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"ravi@example.com","password":"Secret123"}'
# copy token from response

curl -X POST http://localhost:3000/api/update-score -H 'Content-Type: application/json' -H 'Authorization: Bearer <jwt>' -d '{"email":"ravi@example.com","points":30,"subject":"math"}'
``` 

### Teacher flow
1. Signup
2. Login
3. Add student to class

```bash
curl -X POST http://localhost:3000/api/teacher/signup -H 'Content-Type: application/json' -d '{"name":"Priya","email":"priya@school.com","school":"Oak Public","class":"Class 2","password":"Teach1234"}'

curl -X POST http://localhost:3000/api/teacher/login -H 'Content-Type: application/json' -d '{"email":"priya@school.com","password":"Teach1234"}'
# copy teacher token

curl -X POST http://localhost:3000/api/teacher/students/add -H 'Content-Type: application/json' -H 'Authorization: Bearer <jwt>' -d '{"email":"ravi@example.com","password":"Secret123","rollNumber":"A1","dateOfBirth":"2014-05-20","parentName":"Sunil","parentEmail":"sunil@example.com","parentPhone":"9998887776","dataCollectionConsent":true,"classId":"<classId>"}'
```
