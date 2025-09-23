# Coupon System Implementation Guide

## 🎯 **Overview**

Complete implementation of subscription coupon system with database setup, API endpoints, frontend integration, and payment flow handling.

## 📋 **Quick Setup**

### 1. Database Setup
```bash
# Run these SQL files in order
psql $DATABASE_URL -f database/simple_coupons.sql
psql $DATABASE_URL -f database/security_policies.sql
```

### 2. Backend Integration
- ✅ Routes: `/api/coupons/*` and `/api/subscriptions/*`
- ✅ Controllers: `couponController.js`, `subscriptionController.js`
- ✅ Database functions: `validate_coupon()`, `apply_coupon()`

## 🔧 **API Endpoints**

### **Coupon Management**

#### 1. Validate Coupon
**POST** `/api/coupons/validate`
```json
{
  "coupon_code": "FREE3MONTHS",
  "plan_id": "3months"
}
```

#### 2. Apply Coupon
**POST** `/api/coupons/apply`
```json
{
  "coupon_code": "FREE3MONTHS",
  "plan_id": "3months"
}
```

#### 3. Get Coupon History
**GET** `/api/coupons/history`

### **Subscription Management**

#### 1. Create Order (with coupon validation)
**POST** `/api/subscriptions/create-order`
```json
{
  "plan_id": "3months",
  "coupon_code": "FREE3MONTHS"
}
```

#### 2. Create Free Subscription
**POST** `/api/subscriptions/create-free`
```json
{
  "plan_id": "3months",
  "coupon_code": "FREE3MONTHS"
}
```

#### 3. Process Payment (with coupon application)
**POST** `/api/subscriptions/process-payment`
```json
{
  "razorpay_order_id": "order_123",
  "razorpay_payment_id": "pay_123",
  "razorpay_signature": "signature_123",
  "plan_id": "3months",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-04-01T00:00:00Z",
  "amount_paid": 0,
  "coupon_code": "FREE3MONTHS"
}
```

## 🎨 **Frontend Implementation**

### **Correct Payment Flow**

```javascript
class CouponPaymentFlow {
  constructor() {
    this.selectedPlan = null;
    this.couponCode = null;
    this.orderData = null;
  }

  // Step 1: Validate coupon (no usage recorded)
  async validateCoupon(couponCode) {
    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        coupon_code: couponCode,
        plan_id: this.selectedPlan.id
      })
    });

    const data = await response.json();
    
    if (data.success && data.validation.valid) {
      this.couponCode = couponCode;
      this.updatePricingDisplay(data.validation);
      return true;
    } else {
      this.showErrorMessage(data.validation?.error || 'Invalid coupon code');
      return false;
    }
  }

  // Step 2: Create order (validation only)
  async createOrder() {
    const response = await fetch('/api/subscriptions/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        plan_id: this.selectedPlan.id,
        coupon_code: this.couponCode
      })
    });

    const data = await response.json();
    
    if (data.success) {
      this.orderData = data;
      this.updatePricingDisplay(data.pricing);
      return data;
    } else {
      throw new Error(data.message);
    }
  }

  // Step 3: Process payment (applies coupon on success)
  async processPayment() {
    if (!this.orderData) {
      throw new Error('No order data available');
    }

    // Check if it's a free subscription
    if (this.orderData.is_free) {
      console.log('🎉 Free subscription - using create-free endpoint');
      return await this.createFreeSubscription();
    }

    // Process payment through Razorpay
    return await this.processRazorpayPayment();
  }

  // Create free subscription (applies coupon)
  async createFreeSubscription() {
    const response = await fetch('/api/subscriptions/create-free', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        plan_id: this.selectedPlan.id,
        coupon_code: this.couponCode
      })
    });

    const data = await response.json();
    
    if (data.success) {
      this.showSuccessMessage('Free subscription activated successfully!');
      return data;
    } else {
      throw new Error(data.message);
    }
  }

  // Process Razorpay payment (applies coupon on success)
  async processRazorpayPayment() {
    const options = {
      key: process.env.RAZORPAY_KEY_ID,
      amount: this.orderData.order.amount,
      currency: this.orderData.order.currency,
      name: 'Stoory',
      description: `${this.selectedPlan.name} Subscription`,
      order_id: this.orderData.order.id,
      handler: async (response) => {
        await this.verifyPayment(response);
      },
      prefill: {
        name: this.getCurrentUser().name,
        email: this.getCurrentUser().email,
      },
      theme: { color: '#3B82F6' }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  }

  // Verify payment (applies coupon)
  async verifyPayment(paymentResponse) {
    const response = await fetch('/api/subscriptions/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        plan_id: this.selectedPlan.id,
        start_date: this.orderData.subscription_data.start_date,
        end_date: this.orderData.subscription_data.end_date,
        amount_paid: this.orderData.subscription_data.amount_paid,
        coupon_code: this.couponCode
      })
    });

    const data = await response.json();
    
    if (data.success) {
      this.showSuccessMessage('Payment successful! Subscription activated.');
      return data;
    } else {
      throw new Error(data.message);
    }
  }

  // Update pricing display
  updatePricingDisplay(pricing) {
    document.getElementById('original-price').textContent = `₹${pricing.original_price}`;
    document.getElementById('discount-amount').textContent = `-₹${pricing.discount_amount}`;
    document.getElementById('final-price').textContent = `₹${pricing.final_price}`;
    document.getElementById('savings').textContent = `You save ₹${pricing.savings}`;
    
    const discountSection = document.getElementById('discount-section');
    if (pricing.discount_amount > 0) {
      discountSection.style.display = 'block';
    } else {
      discountSection.style.display = 'none';
    }
    
    const payButton = document.getElementById('pay-button');
    if (pricing.final_price === 0) {
      payButton.textContent = 'Activate Free Subscription';
      payButton.className = 'btn btn-success';
    } else {
      payButton.textContent = `Pay ₹${pricing.final_price}`;
      payButton.className = 'btn btn-primary';
    }
  }

  // Utility methods
  getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  showSuccessMessage(message) {
    alert(message); // Replace with your notification system
  }

  showErrorMessage(message) {
    alert(message); // Replace with your notification system
  }
}
```

## 🔄 **Complete Flow**

### **Step 1: Validate Coupon**
```javascript
const payment = new CouponPaymentFlow();
payment.selectPlan({ id: '3months', price: 1200 });

// Validate coupon (no usage recorded)
const isValid = await payment.validateCoupon('FREE3MONTHS');
// UI shows: Original: ₹1200, Discount: -₹1200, Final: ₹0
```

### **Step 2: Create Order**
```javascript
// Create order (validation only)
const orderData = await payment.createOrder();
// Backend validates coupon, returns: final_price = 0, is_free = true
```

### **Step 3: Process Payment**
```javascript
// Process payment
await payment.processPayment();
// If is_free = true: Uses create-free endpoint (applies coupon)
// If is_free = false: Uses Razorpay + process-payment (applies coupon)
```

## 🎯 **Key Features**

### **1. No Double Coupon Usage**
- ✅ Coupon validated during order creation (no usage recorded)
- ✅ Coupon applied only when payment succeeds
- ✅ Frontend can validate multiple times without issues

### **2. Free Subscriptions**
- ✅ Backend returns `is_free: true` for 100% discounts
- ✅ Frontend uses create-free endpoint instead of Razorpay
- ✅ No Razorpay errors for 0 amount orders

### **3. Proper Payment Flow**
- ✅ Paid subscriptions use Razorpay
- ✅ Free subscriptions use create-free endpoint
- ✅ Coupon applied only on successful payment

## 🛡️ **Security**

### **Database Security (RLS)**
- Users can only access their own coupon usage
- Admins can manage all coupons
- Public can view active coupons

### **API Security**
- Authentication required for all endpoints
- Role-based access control
- Input validation

## 🎯 **Available Coupons**

### **FREE3MONTHS**
- **Type**: Percentage (100%)
- **Description**: 3-Month Free Trial
- **Valid for**: 3-month plans only
- **Usage limit**: 1000 users
- **Per user limit**: 1 time

## 📊 **Error Handling**

### **Common Errors**
```json
// Invalid coupon
{
  "success": false,
  "message": "Invalid coupon code"
}

// Coupon expired
{
  "success": false,
  "message": "Coupon has expired"
}

// Usage limit exceeded
{
  "success": false,
  "message": "You have already used this coupon"
}
```

## 🚀 **Quick Start**

1. **Run the SQL files** to set up the database
2. **Copy the frontend code** into your application
3. **Update plan prices** in your frontend
4. **Replace auth functions** with your implementation
5. **Test with FREE3MONTHS coupon**

## 📝 **Testing**

### **Test Free Coupon**
```javascript
// This should create a free subscription
const payment = new CouponPaymentFlow();
payment.selectPlan({ id: '3months', price: 1200 });
await payment.validateCoupon('FREE3MONTHS');
const orderData = await payment.createOrder();
await payment.processPayment(); // Should use create-free endpoint
```

### **Test Paid Subscription**
```javascript
// This should use Razorpay
const payment = new CouponPaymentFlow();
payment.selectPlan({ id: '1month', price: 400 });
await payment.validateCoupon('DISCOUNT20'); // 20% discount
const orderData = await payment.createOrder();
await payment.processPayment(); // Should use Razorpay
```

That's everything you need for the complete coupon system! 🎯
