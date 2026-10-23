# API Documentation

Base URL: `http://localhost:4000`

All responses follow this shape:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... },
  "errors": { "field": ["error message"] },
  "pagination": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## Auth Endpoints

### POST /api/auth/register

Register a new user account.

**Rate limited:** 20 requests / 15 minutes per IP.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

Password rules: min 8 chars, at least one uppercase, lowercase, number, and special character.

**Success 201:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Sets `token` HttpOnly cookie.

**Errors:** `409` duplicate email · `422` validation failed

---

### POST /api/auth/login

**Rate limited.** Authenticates a user.

**Request body:**
```json
{ "email": "user@example.com", "password": "SecurePass1!" }
```

**Success 200:** Same shape as register. Sets `token` cookie.

**Errors:** `401` invalid credentials · `403` account deactivated · `422` validation

---

### POST /api/auth/logout

Clears the authentication cookie.

**Auth:** Required (JWT cookie or Bearer token)

**Success 200:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### GET /api/auth/me

Returns the authenticated user's profile.

**Auth:** Required

**Success 200:**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": { "id": "...", "email": "...", ... }
}
```

**Errors:** `401` missing/invalid/expired token

---

### PATCH /api/auth/change-password

Changes the user's password and clears the session cookie.

**Auth:** Required

**Request body:**
```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass2@",
  "confirmPassword": "NewPass2@"
}
```

**Success 200:** Cookie cleared. User must re-login.

**Errors:** `400` wrong current password · `422` validation failed

---

## Admin Endpoints

All admin endpoints require:
- Valid JWT (cookie or Bearer token)
- User role = `ADMIN`

Returns `401` if unauthenticated, `403` if not ADMIN.

---

### GET /api/admin/users

Lists all users with pagination and search.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` — searches email, firstName, lastName
- `role` — filter by `USER` or `ADMIN`
- `status` — filter by `ACTIVE` or `INACTIVE`

**Success 200:**
```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [ { "id": "...", "email": "...", ... } ],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

`passwordHash` is never included in the response.

---

### GET /api/admin/users/:id

Returns a single user by ID.

**Success 200:** Single user object (no passwordHash).

**Errors:** `404` user not found

---

### PATCH /api/admin/users/:id/role

Changes a user's role.

**Request body:**
```json
{ "role": "ADMIN" | "USER" }
```

**Protection:** An admin cannot change their own role.

**Success 200:** Updated user object.

**Errors:** `403` self-modification · `404` not found · `422` invalid role

---

### PATCH /api/admin/users/:id/status

Activates or deactivates a user account.

**Request body:**
```json
{ "status": "ACTIVE" | "INACTIVE" }
```

**Protection:** An admin cannot deactivate their own account.

**Success 200:** Updated user object.

**Errors:** `403` self-modification · `404` not found · `422` invalid status

---

### GET /api/admin/audit-logs

Returns paginated audit log entries.

**Query params:**
- `page`, `limit`
- `targetId` — filter by subject user ID
- `actorId` — filter by actor user ID
- `action` — partial match on action name

**Success 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "action": "ROLE_CHANGED",
      "targetId": "...",
      "actorId": "...",
      "metadata": { "before": { "role": "USER" }, "after": { "role": "ADMIN" } },
      "createdAt": "..."
    }
  ],
  "pagination": { ... }
}
```

---

## Error Codes Reference

| Code | Meaning |
|------|---------|
| 400 | Bad request (e.g. wrong current password) |
| 401 | Unauthenticated (missing, invalid, or expired token) |
| 403 | Forbidden (wrong role, or self-modification) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Validation failed (field-level errors in `errors` key) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
