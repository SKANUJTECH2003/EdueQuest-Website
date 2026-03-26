# SECURITY.md

## 1. JWT security
- Store JWT securely in browser localStorage (current app) and invalidate on logout.
- Recommend moving to HTTP-only secure cookies in production for better XSS protection.
- Use a strong `JWT_SECRET` and never commit it to source control.
- Token expiry is set to 7 days. Add refresh token pattern for long-lived sessions.
- Protect routes in `server.js` with `authenticateToken`.

## 2. HTTPS
- Always serve through HTTPS in production (TLS/SSL).
- Set `app.set('trust proxy', 1)` for reverse proxy setups (nginx, Cloudflare) before auth checks.
- Redirect HTTP → HTTPS server-side via proxy layer or Express middleware.

## 3. CORS
- Current uses `cors()` open policy; in production should restrict origin:
  - e.g., `cors({ origin: ['https://yourdomain.com'], methods: ['GET','POST','PATCH','DELETE'] })`
- Always validate and sanitize incoming payloads to avoid open REST abuse.

## 4. Passwords
- Hash passwords with `bcryptjs` + salt (existing in `UserSchema.pre('save')`).
- Enforce strong passwords by policy (also in teacher signup route, e.g., uppercase, numbers, min length).
- Never store plaintext passwords.
- For social auth, generate secure random placeholder passwords and mark account type.

## 5. Data retention
- Store least data required, e.g.
  - `User` has subjectScores and points, no unnecessary PII.
  - `Teacher` has embedded student snapshots for roster; avoid duplication or keep minimal.
- Implement data deletion endpoints for GDPR compliance (not current but recommended).
- Create retention policy:
  - stale accounts: 1 year inactivity archive
  - old session logs: archive/purge after 2 years

## 6. Secure headers
- Add recommended middleware such as `helmet` and specific headers:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy` and `Strict-Transport-Security`

## 7. Monitoring and audit
- Log authentication events, failed login attempts, admin operations.
- Use `auditLogging` in teacher privacy settings to record critical changes.
- Keep an incident response plan for leaked credentials.
