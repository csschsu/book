# 🔒 Security Review — Production Booking System

**Target:** `/home/christer/test/`  
**Date:** 2026-09-26  
**Reviewer:** Antigravity AI  

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 2 |
| 🟠 HIGH | 5 |
| 🟡 MEDIUM | 5 |
| 🔵 LOW | 4 |
| ⚪ INFO | 2 |

---

## 🔴 CRITICAL

### 1. Hardcoded JWT Secret Key (Default Fallback in Source Code)

**File:** [JwtService.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/JwtService.java#L21)  
**Line 21:**
```java
@Value("${jwt.secret:defaultSecretKeyForCommunityBookingAppSecure256BitsMinimum!}")
private String secretKey;
```

**Problem:** The JWT signing secret has a hardcoded default value baked into the source code. The production `application.properties` does **not** set `jwt.secret`, which means the running production system uses this default. Anyone who reads the source code (e.g., on GitHub) can forge arbitrary JWT tokens and impersonate any user, including BOOKADMIN.

**Impact:** Complete authentication bypass. An attacker can craft a valid admin JWT token and perform any action.

**Fix:** Add a strong, unique `jwt.secret` to the production `application.properties` (≥64 random characters). Remove the default value from the annotation (make it fail-fast if unconfigured).

---

### 2. Public API Exposes User Email Addresses (PII Leak)

**File:** [SecurityConfig.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/SecurityConfig.java#L52)  
**Line 52:**
```java
.requestMatchers(HttpMethod.GET, "/booked", "/booked/**").permitAll()
```

**Verified:** Running `curl http://localhost:9091/booked?locationId=1` **without any authentication** returns every booking record including:
- `userEmail` (e.g. `christer.sundgren@systemkonstruktion.se`)
- `userId`
- `alias`

This leaks real user email addresses and booking patterns to anyone on the internet.

**Impact:** GDPR violation. User email harvesting. Reveals who booked what and when.

**Fix:** Either require authentication for `/booked` endpoints, or strip `userEmail` and `userId` from the public response (return only alias or anonymized data).

---

## 🟠 HIGH

### 3. CORS Allows All Origins with Credentials

**File:** [SecurityConfig.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/SecurityConfig.java#L89)
```java
configuration.setAllowedOriginPatterns(List.of("*"));
configuration.setAllowCredentials(true);
```

**Problem:** Wildcard CORS with `allowCredentials=true` means any website can make authenticated cross-origin requests to your API. A malicious site could perform actions on behalf of a logged-in user.

**Fix:** Restrict to specific origins: `https://book.systemkonstruktion.se`, `http://localhost:3001`.

---

### 4. No Rate Limiting on Login Endpoint

**Files:** [AuthController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/AuthController.java), [SecurityConfig.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/SecurityConfig.java)

**Problem:** The `/login` endpoint has no rate limiting, account lockout, or brute-force protection. An attacker can send unlimited login attempts at full speed.

**Impact:** Password brute-forcing is trivially easy, especially since there is no password complexity requirement (see #7).

**Fix:** Add rate limiting (e.g., Spring Boot filter, bucket4j, or a reverse proxy like Nginx with `limit_req`). Consider temporary account lockout after N failed attempts.

---

### 5. No TLS/HTTPS — Plain HTTP in Production

**Files:** [application.properties](file:///home/christer/test/application.properties), [run.sh](file:///home/christer/test/deploy/run.sh)

**Problem:** The backend runs on `http://localhost:9091` (plain HTTP). The frontend runs on `http://localhost:3001`. There is no `server.ssl.*` configuration. JWT tokens and credentials are transmitted in cleartext.

**Impact:** Man-in-the-middle attacks can intercept JWT tokens, login credentials, and all API traffic.

**Fix:** Terminate TLS at a reverse proxy (Nginx, Caddy) in front of the application, or configure Spring Boot's embedded Tomcat with a TLS certificate.

---

### 6. JWT Token Cannot Be Revoked (Logout Is Ineffective)

**File:** [AuthController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/AuthController.java#L54-L58)
```java
@PostMapping({"/logout", "/auth/logout"})
public ResponseEntity<Map<String, String>> logout() {
    SecurityContextHolder.clearContext();
    return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
}
```

**Problem:** Logout only clears the server-side SecurityContext (which is stateless/empty anyway). The JWT token remains valid until its 24-hour expiration. A stolen token cannot be invalidated.

**Impact:** If a token is compromised, there is no way to revoke it for up to 24 hours.

**Fix:** Implement a token blacklist (Redis/DB-backed), use shorter-lived access tokens with refresh tokens, or reduce the JWT expiration time.

---

### 7. No Password Policy Enforcement

**Files:** [BookController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/BookController.java#L217-L231), [Book.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/Book.java#L275-L282)

**Problem:** The `POST /user` (create user) and `PUT /user/{id}` (update user) endpoints accept any password without validation. There is no minimum length, no complexity requirement. `CreateInitialUser.java` enforces 6-character minimum, but the API endpoints do not.

**Impact:** Users can set extremely weak passwords (e.g., `"a"`), making brute-force trivial.

**Fix:** Add server-side password validation (minimum 8 chars, mixed case + numbers at minimum).

---

## 🟡 MEDIUM

### 8. Debug Logging Enabled in Production

**File:** [application.properties](file:///home/christer/test/application.properties#L10)
```properties
logging.level.org.community.booking=DEBUG
```

**Problem:** DEBUG-level logging in production can expose sensitive data in log files (SQL queries, user data, request details, stack traces).

**Fix:** Set to `INFO` or `WARN` in production.

---

### 9. IDOR on User Update — Any User Can Update Any Other User

**File:** [SecurityConfig.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/SecurityConfig.java#L62-L63)
```java
.requestMatchers(HttpMethod.PUT, "/user", "/user/**", "/users", "/users/**")
.hasAnyRole("BOOKADMIN", "BOOKUSER")
```

**File:** [BookController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/BookController.java#L234-L243)

**Problem:** Any authenticated BOOKUSER can call `PUT /user/{id}` with *any* user ID and update that user's email, role, alias, etc. There is no check that the authenticated user's ID matches the target `{id}`. A regular user could escalate their own role to BOOKADMIN.

**Impact:** Privilege escalation. Any logged-in user can make themselves admin.

**Fix:** In the `updateUser` controller method, verify that either: (a) the authenticated user's ID matches the path `{id}`, or (b) the authenticated user has BOOKADMIN role. Block regular users from changing the `role` field.

---

### 10. JWT Token Stored in localStorage (XSS Vulnerability)

**File:** [api.ts](file:///home/christer/work/book/bookingapp/src/services/api.ts#L7-L21)
```typescript
localStorage.setItem(AUTH_KEY, JSON.stringify(session));
```

**Problem:** JWT tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. If there is an XSS vulnerability (even from a third-party library), the token can be stolen.

**Fix:** Consider using `httpOnly` cookies for token storage (requires backend changes). If staying with localStorage, ensure robust XSS protection (Content-Security-Policy headers).

---

### 11. Missing Content-Security-Policy Header

**Verified:** The HTTP response from the backend includes `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` (Spring Security defaults), but there is **no** `Content-Security-Policy` header, no `Strict-Transport-Security` header, and no `Referrer-Policy`.

**Fix:** Add security headers via a Spring Security configuration or reverse proxy:
```
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

### 12. Database File Permissions Too Open

**Verified:**
```
664 christer:christer /home/christer/test/application.properties
664 christer:christer /home/christer/test/booking_system.db
```

**Problem:** Both the database and config file are world-readable (mode `664` = owner+group read/write, others read). Any local user on the system can read the database (which contains BCrypt password hashes) and the configuration file.

**Fix:** `chmod 600` on both files (owner-only read/write).

---

## 🔵 LOW

### 13. `@CrossOrigin(origins = "*")` Duplicated on Controllers

**Files:** [BookController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/BookController.java#L16), [AuthController.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/AuthController.java#L17)

Both controllers have `@CrossOrigin(origins = "*")` in addition to the global CORS config. This is redundant and may override the global policy if the global policy is tightened.

**Fix:** Remove `@CrossOrigin` from individual controllers; rely on the global `CorsConfigurationSource` bean.

---

### 14. Booking Deletion Not Scoped to Owner

**File:** [SecurityConfig.java](file:///home/christer/work/book/bookingweb/src/main/java/org/community/booking/security/SecurityConfig.java#L68)
```java
.requestMatchers(HttpMethod.DELETE, "/bookedTime/**").hasAnyRole("BOOKUSER", "BOOKADMIN")
```

Any authenticated user can delete any other user's booking by ID. There is no ownership check.

**Fix:** Verify the booking belongs to the requesting user (or the user is admin) before allowing deletion.

---

### 15. `spring-boot-devtools` Included in Dependencies

**File:** `bookingweb/pom.xml`
```xml
<artifactId>spring-boot-devtools</artifactId>
<scope>runtime</scope>
```

DevTools should not be in production builds. While Spring Boot usually auto-disables it when running from a packaged JAR/WAR, it's best practice to exclude it.

**Fix:** Change scope to `provided` or add a profile to exclude it from production.

---

### 16. Old `jjwt` Library Version

**File:** `pom.xml` → `jsonwebtoken.version = 0.11.5`

The current latest is 0.12.x. Version 0.11.5 uses deprecated APIs (`Jwts.parserBuilder()`, `SignatureAlgorithm.HS256`).

**Fix:** Upgrade to jjwt 0.12.x and use the updated API.

---

## ⚪ INFO

### 17. SQLite as Production Database

SQLite is a single-file, single-writer database. It works for low-traffic applications but has limitations:
- No concurrent write support (writes block each other)
- No user-level access control
- Database corruption risk if the file is accessed by multiple processes

For a small booking system this is acceptable, but be aware of the scaling limitations.

---

### 18. SQL Injection — Not a Concern (Good)

All database queries use JDBI's `@Bind` / `@BindBean` parameterized queries. No string concatenation in SQL was found. ✅

---

## Priority Action Plan

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Set unique `jwt.secret` in production config | 5 min |
| 2 | Fix IDOR: scope user updates to self (or admin) | 30 min |
| 3 | Restrict CORS to specific origins | 10 min |
| 4 | Remove/anonymize `userEmail` from public `/booked` | 30 min |
| 5 | Add password policy (min 8 chars) | 20 min |
| 6 | `chmod 600` on config and DB files | 1 min |
| 7 | Set logging level to INFO in production | 1 min |
| 8 | Add rate limiting on `/login` | 1-2 hr |
| 9 | Set up TLS termination (reverse proxy) | 1-2 hr |
| 10 | Add CSP and HSTS headers | 30 min |
