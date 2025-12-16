# Bulk Login Endpoint Documentation

## POST /api/auth/bulk-login

This endpoint is used for login by **Brand Owners** and **Admins** only. It verifies the OTP and sets a secure HTTP-only cookie with the authentication token.

### Request Body

```json
{
  "phone": "+1234567890",
  "token": "123456",
  "userData": {
     // Optional: user profile data if creating a new user (though usually bulk login is for existing users)
  }
}
```

### Response

**Success (200 OK)**

Returns the user profile and tokens. Also sets a `token` cookie.

```json
{
  "success": true,
  "user": {
    "id": "...",
    "role": "brand_owner",
    "phone": "..."
    // ... other user fields
  },
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "message": "Bulk login successful"
}
```

**Cookies Set:**
- `token`: The JWT access token.
  - `HttpOnly`: true
  - `Secure`: true (in production)
  - `SameSite`: Strict (in production) / Lax (in dev)
  - `Max-Age`: 1 day

**Error (403 Forbidden)**

If the user role is not `brand_owner` or `admin`.

```json
{
  "success": false,
  "message": "Access restricted to brand owners and admins only.",
  "error_code": "FORBIDDEN_ROLE"
}
```

**Error (400 Bad Request)**

If OTP is invalid or validation fails.

```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```
