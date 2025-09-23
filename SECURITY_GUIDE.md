# Security Guide for Coupon System

## Database Security (RLS Policies)

### 1. FCM Tokens
- **Users can only access their own FCM tokens**
- **CRUD operations restricted to token owner**
- **No cross-user access allowed**

### 2. Coupons
- **Public can view active coupons** (for validation)
- **Only admins can manage coupons** (create, update, delete)
- **Users cannot create their own coupons**

### 3. Coupon Usage
- **Users can only view their own usage history**
- **Users can insert their own usage records** (when applying coupons)
- **Only admins can update/delete usage records**
- **Users cannot modify existing usage records**

## API Security

### User Endpoints (Require Authentication)
- `POST /api/coupons/validate` - Validate coupon code
- `POST /api/coupons/apply` - Apply coupon to order
- `POST /api/coupons/create-subscription` - Create subscription with coupon
- `GET /api/coupons/history` - Get user's coupon history

### Admin Endpoints (Require Admin Role)
- `GET /api/coupons/admin/all` - Get all coupons
- `POST /api/coupons/admin/create` - Create new coupon
- `PUT /api/coupons/admin/:couponId` - Update coupon
- `DELETE /api/coupons/admin/:couponId` - Delete coupon
- `GET /api/coupons/admin/stats` - Get coupon usage statistics

## Security Features

### 1. Row Level Security (RLS)
- **Enabled on all tables**: `fcm_tokens`, `coupons`, `coupon_usage`
- **Policies prevent unauthorized access**
- **Users can only access their own data**

### 2. Role-Based Access Control
- **Admin role required** for coupon management
- **User role** for basic coupon operations
- **Role validation** in all admin endpoints

### 3. Data Validation
- **Input validation** on all endpoints
- **Type checking** for all parameters
- **Required field validation**

### 4. Audit Trail
- **Usage tracking** for all coupon applications
- **Timestamp recording** for all operations
- **User identification** in all records

## Setup Instructions

### 1. Run Database Setup
```sql
-- First run the coupon system
database/simple_coupons.sql

-- Then apply security policies
database/security_policies.sql
```

### 2. Verify Security
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('fcm_tokens', 'coupons', 'coupon_usage');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('fcm_tokens', 'coupons', 'coupon_usage');
```

## Security Best Practices

### 1. Authentication
- **Always verify user authentication** before processing requests
- **Use JWT tokens** for session management
- **Validate token expiration**

### 2. Authorization
- **Check user roles** before allowing admin operations
- **Validate ownership** before data access
- **Implement proper error messages** (don't reveal system details)

### 3. Data Protection
- **Use RLS policies** for database-level security
- **Validate all inputs** before processing
- **Sanitize data** before storage

### 4. Monitoring
- **Log all admin operations**
- **Track failed authentication attempts**
- **Monitor unusual usage patterns**

## API Usage Examples

### User Operations
```javascript
// Validate coupon (requires authentication)
const response = await fetch('/api/coupons/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    coupon_code: 'FREE3MONTHS',
    order_amount: 299.00
  })
});

// Get user's coupon history
const history = await fetch('/api/coupons/history', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Admin Operations
```javascript
// Create new coupon (requires admin role)
const newCoupon = await fetch('/api/coupons/admin/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    code: 'WELCOME20',
    name: 'Welcome Discount',
    type: 'percentage',
    value: 20.00,
    min_order_amount: 100.00
  })
});

// Get coupon statistics
const stats = await fetch('/api/coupons/admin/stats', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

## Error Handling

### Common Security Errors
- **403 Forbidden**: Admin role required
- **401 Unauthorized**: Invalid or expired token
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Server-side error

### Error Response Format
```json
{
  "success": false,
  "message": "Access denied. Admin role required.",
  "error": "Detailed error message (in development only)"
}
```

## Testing Security

### 1. Test RLS Policies
```sql
-- Test user can only see own data
SET ROLE 'authenticated';
SELECT * FROM coupon_usage; -- Should only show user's records

-- Test admin can see all data
SET ROLE 'admin';
SELECT * FROM coupon_usage; -- Should show all records
```

### 2. Test API Endpoints
```javascript
// Test without authentication
fetch('/api/coupons/validate', {
  method: 'POST',
  body: JSON.stringify({ coupon_code: 'TEST' })
}); // Should return 401

// Test with user token on admin endpoint
fetch('/api/coupons/admin/all', {
  headers: { 'Authorization': `Bearer ${userToken}` }
}); // Should return 403
```

This security implementation ensures that:
- Users can only access their own data
- Admins have full control over the system
- All operations are properly authenticated and authorized
- Data is protected at both API and database levels
