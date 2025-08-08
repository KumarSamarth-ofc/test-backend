# 🚀 Stoory Backend API Testing Guide

## 📋 Test Data Summary

### **Users Created:**
- **Brand Owners**: 3 users (Fashion, Tech, Food niches)
- **Influencers**: 4 users (different niches and follower counts)
- **Admin**: 1 user (full access)

### **Campaigns**: 4 campaigns (different statuses)
### **Bids**: 3 bids (all open)
### **Requests**: 7 connections (different statuses)
### **Conversations**: 3 active chats
### **Messages**: 9 messages across conversations
### **Transactions**: 5 payment records

---

## 🧪 API Testing Examples

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

### **2. Authentication (Mock)**
Since we're using Supabase auth, you'll need to:
1. Create users in Supabase Auth
2. Get JWT tokens
3. Use tokens in Authorization header

**Example with mock token:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/campaigns
```

### **3. Campaign APIs**

**Get All Campaigns:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/campaigns
```

**Get Campaign by ID:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/campaigns/550e8400-e29b-41d4-a716-446655440101
```

**Create Campaign (Brand Owner):**
```bash
curl -X POST -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "New Fashion Campaign",
       "description": "Promote our latest collection",
       "budget": 3000,
       "start_date": "2024-07-01",
       "end_date": "2024-09-30",
       "requirements": "Fashion influencer with 20k+ followers",
       "deliverables": ["3 Instagram posts", "1 YouTube video"]
     }' \
     http://localhost:3000/api/campaigns
```

### **4. Bid APIs**

**Get All Bids:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/bids
```

**Create Bid (Brand Owner):**
```bash
curl -X POST -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Quick Product Review",
       "description": "Need a quick review of our new product",
       "budget": 500
     }' \
     http://localhost:3000/api/bids
```

### **5. Request APIs**

**Get All Requests:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/requests
```

**Create Request (Influencer):**
```bash
curl -X POST -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "campaign_id": "550e8400-e29b-41d4-a716-446655440101"
     }' \
     http://localhost:3000/api/requests
```

**Update Agreed Amount:**
```bash
curl -X PUT -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "final_agreed_amount": 2000
     }' \
     http://localhost:3000/api/requests/550e8400-e29b-41d4-a716-446655440301/agree
```

### **6. Conversation APIs**

**Get All Conversations:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/messages/conversations
```

**Get Messages in Conversation:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/messages/conversations/550e8400-e29b-41d4-a716-446655440401/messages
```

**Send Message:**
```bash
curl -X POST -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Hello! I am interested in your campaign."
     }' \
     http://localhost:3000/api/messages/conversations/550e8400-e29b-41d4-a716-446655440401/messages
```

### **7. Payment APIs**

**Process Payment:**
```bash
curl -X POST -H "Authorization: Bearer mock_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{
       "razorpay_order_id": "order_test123",
       "razorpay_payment_id": "pay_test123",
       "razorpay_signature": "valid_signature",
       "request_id": "550e8400-e29b-41d4-a716-446655440301",
       "amount": 600,
       "payment_stage": "initial"
     }' \
     http://localhost:3000/api/payments/process-payment
```

**Get Transaction History:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/payments/transactions
```

**Get Wallet Balance:**
```bash
curl -H "Authorization: Bearer mock_jwt_token" \
     http://localhost:3000/api/payments/wallet/balance
```

---

## 🎯 Test Scenarios

### **Scenario 1: Influencer Discovers Campaigns**
1. Get all campaigns → Should see 4 campaigns
2. Filter by status=open → Should see 3 open campaigns
3. Get campaign details → Should see full details

### **Scenario 2: Influencer Applies to Campaign**
1. Create request → Should create connection
2. Update agreed amount → Should update to negotiating status
3. Process payment → Should update to paid status

### **Scenario 3: Chat Between Brand and Influencer**
1. Get conversations → Should see relevant conversations
2. Send message → Should appear in chat
3. Mark as seen → Should update seen status

### **Scenario 4: Payment Flow**
1. Process initial payment (30%) → Should update request status
2. Process final payment (70%) → Should complete the deal
3. Check wallet balance → Should reflect payments

---

## 🔧 Testing Tools

### **Postman Collection:**
You can import these requests into Postman for easier testing.

### **cURL Scripts:**
Save the cURL commands in a shell script for batch testing.

### **Expected Responses:**
All APIs should return:
```json
{
  "success": true,
  "data": [...],
  "message": "Operation successful"
}
```

---

## 🚨 Common Issues

1. **Authentication**: Make sure to include valid JWT tokens
2. **Role Permissions**: Different roles have different access levels
3. **Status Flow**: Requests follow: connected → negotiating → paid → completed
4. **Payment Stages**: initial (30%) → final (70%)

---

## 📊 Test Data IDs

**Users:**
- Brand Owner 1: `550e8400-e29b-41d4-a716-446655440001`
- Influencer 1: `550e8400-e29b-41d4-a716-446655440004`

**Campaigns:**
- Summer Fashion: `550e8400-e29b-41d4-a716-446655440101`
- Gaming Headset: `550e8400-e29b-41d4-a716-446655440102`

**Requests:**
- Connected: `550e8400-e29b-41d4-a716-446655440301`
- Negotiating: `550e8400-e29b-41d4-a716-446655440302`

**Conversations:**
- Food Review: `550e8400-e29b-41d4-a716-446655440401`

Happy Testing! 🚀 