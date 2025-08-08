# Stoory Registration Flow Documentation

## Overview
This document outlines the complete registration flow for new users in the Stoory platform. The registration process is separate from login and ensures only new users can register.

## 🔐 Registration Flow Steps

### **Step 1: Check Phone Number Availability**
**Purpose:** Verify if the phone number is available for registration

**API Endpoint:** `POST /api/auth/send-registration-otp`

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Headers:**
```
Content-Type: application/json
```

**Success Response (Phone Available):**
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp"
}
```

**Error Response (Phone Already Registered):**
```json
{
  "success": false,
  "message": "Account already exists. Please login instead.",
  "code": "USER_ALREADY_EXISTS"
}
```

**Error Response (Invalid Phone):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "+919876543210",
      "msg": "Please provide a valid phone number",
      "path": "phone",
      "location": "body"
    }
  ]
}
```

---

### **Step 2: Verify OTP & Create Account**
**Purpose:** Verify the OTP and create the user account

**API Endpoint:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "phone": "+919876543210",
  "token": "123456",
  "userData": {
    "name": "John Doe",
    "email": "john@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English", "Hindi"],
    "categories": ["Fashion", "Lifestyle"],
    "min_range": 1000,
    "max_range": 50000
  }
}
```

**Headers:**
```
Content-Type: application/json
```

**Success Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English", "Hindi"],
    "categories": ["Fashion", "Lifestyle"],
    "min_range": 1000,
    "max_range": 50000,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "jwt-token-here",
  "message": "Authentication successful"
}
```

**Error Response (Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Error Response (Invalid Data):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Please provide a valid email",
      "path": "userData.email",
      "location": "body"
    }
  ]
}
```

---

### **Step 3: Complete Profile (Optional)**
**Purpose:** Update additional profile information after registration

**API Endpoint:** `PUT /api/auth/profile`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "influencer",
  "gender": "male",
  "languages": ["English", "Hindi"],
  "categories": ["Fashion", "Lifestyle"],
  "min_range": 1000,
  "max_range": 50000
}
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Success Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "influencer",
    "gender": "male"
  },
  "message": "Profile updated successfully"
}
```

---

## 📱 Mobile App Implementation

### **Registration Screen Flow:**

```javascript
// 1. User enters phone number and clicks "Register"
async function handleRegistration(phoneNumber) {
  try {
    // Step 1: Send registration OTP
    const response = await fetch('/api/auth/send-registration-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: phoneNumber })
    });

    const data = await response.json();

    if (data.code === 'USER_ALREADY_EXISTS') {
      // User already has an account
      showMessage("Account already exists. Please login instead.");
      showLoginButton();
      return;
    }

    if (data.success) {
      // Phone is available, show OTP input
      showOTPInput();
      setPhoneNumber(phoneNumber);
    } else {
      // Handle validation errors
      showErrors(data.errors);
    }
  } catch (error) {
    showMessage("Network error. Please try again.");
  }
}

// 2. User enters OTP and clicks "Verify"
async function handleOTPVerification(otp, userData) {
  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phoneNumber,
        token: otp,
        userData: userData
      })
    });

    const data = await response.json();

    if (data.success) {
      // Registration successful
      storeToken(data.token);
      storeUserData(data.user);
      navigate('/dashboard');
    } else {
      // Invalid OTP
      showMessage(data.message);
    }
  } catch (error) {
    showMessage("Network error. Please try again.");
  }
}

// 3. Optional: Complete profile
async function updateProfile(profileData) {
  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (data.success) {
      showMessage("Profile updated successfully");
      updateUserData(data.user);
    } else {
      showErrors(data.errors);
    }
  } catch (error) {
    showMessage("Network error. Please try again.");
  }
}
```

---

## 🎯 User Data Fields

### **Required Fields:**
- `phone` (string): User's phone number with country code
- `token` (string): 6-digit OTP received via WhatsApp

### **Optional Fields in userData:**
- `name` (string): User's full name (2-100 characters)
- `email` (string): User's email address
- `role` (string): User role - "influencer" or "brand_owner"
- `gender` (string): User gender - "male", "female", or "other"
- `languages` (array): Languages user speaks
- `categories` (array): Content categories user works in
- `min_range` (number): Minimum budget range
- `max_range` (number): Maximum budget range

---

## 🔄 Error Handling

### **Common Error Codes:**

| Code | Description | Action |
|------|-------------|--------|
| `USER_ALREADY_EXISTS` | Phone number already registered | Redirect to login |
| `USER_NOT_FOUND` | Phone number not found (for login) | Redirect to registration |
| `INVALID_OTP` | OTP is incorrect or expired | Show error message |
| `VALIDATION_ERROR` | Invalid input data | Show field-specific errors |

### **Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "type": "field",
      "value": "invalid-value",
      "msg": "Field-specific error message",
      "path": "fieldName",
      "location": "body"
    }
  ]
}
```

---

## 📋 Validation Rules

### **Phone Number:**
- Must be valid international format
- Must include country code (+91 for India)
- Example: `+919876543210`

### **Name:**
- Minimum 2 characters
- Maximum 100 characters
- Optional field

### **Email:**
- Must be valid email format
- Optional field

### **Role:**
- Must be "influencer" or "brand_owner"
- Defaults to "influencer" if not provided

### **Gender:**
- Must be "male", "female", or "other"
- Optional field

### **OTP:**
- Must be 6 digits
- Expires after 10 minutes

---

## 🚀 Complete Registration Example

### **Step 1: Check Availability**
```bash
curl -X POST http://localhost:3000/api/auth/send-registration-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### **Step 2: Verify OTP**
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "token": "123456",
    "userData": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "influencer",
      "gender": "male",
      "languages": ["English", "Hindi"],
      "categories": ["Fashion", "Lifestyle"],
      "min_range": 1000,
      "max_range": 50000
    }
  }'
```

### **Step 3: Update Profile (Optional)**
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English", "Hindi"],
    "categories": ["Fashion", "Lifestyle"],
    "min_range": 1000,
    "max_range": 50000
  }'
```

---

## ✅ Success Flow Summary

1. **User enters phone number** → Check availability
2. **Phone available** → Send OTP via WhatsApp
3. **User enters OTP** → Verify and create account
4. **Account created** → Return JWT token and user data
5. **Optional** → Complete profile with additional information

This registration flow ensures only new users can register and provides clear feedback at each step! 🎉 