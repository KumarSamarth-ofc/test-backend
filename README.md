# 🚀 Stoory Backend - Automated Chat System

## 📋 Overview

This is the backend for the Stoory platform, featuring a **complete automated chat system** that handles influencer-brand owner collaborations through structured, automated workflows.

## ✨ **Key Features**

- 🔄 **Automated Chat Flow** - 9-step structured conversation system
- 🎯 **Role-Based Actions** - Different actions for brand owners and influencers
- 💬 **Smart Message System** - Automatic message generation and audit trails
- 💰 **Payment Integration** - Built-in payment flow handling
- 🔒 **Secure Authentication** - JWT-based user authentication
- 📱 **Real-time Updates** - WebSocket support for live chat
- 🗄️ **Database Persistence** - All conversations and actions are saved

## 🏗️ **Architecture**

```
Frontend (React/React Native) 
    ↓
Backend (Node.js/Express)
    ↓
Database (Supabase/PostgreSQL)
    ↓
External APIs (Razorpay, WhatsApp)
```

## 📚 **Documentation**

### **For Frontend Developers:**
- 📖 **[Frontend API Endpoints Guide](FRONTEND_API_ENDPOINTS_GUIDE.md)** - Complete API reference
- 🎯 **[Frontend Action Buttons Guide](FRONTEND_ACTION_BUTTONS_IMPLEMENTATION_GUIDE.md)** - Implementation details

### **For Backend Developers:**
- 🔧 **API Routes** - Located in `/routes/` directory
- 🎮 **Controllers** - Business logic in `/controllers/` directory
- 🗄️ **Database Schema** - SQL files in `/database/` directory
- ⚙️ **Utilities** - Helper functions in `/utils/` directory

## 🚀 **Quick Start**

### **1. Environment Setup**
```bash
# Copy environment file
cp env.example .env

# Fill in your configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Database Setup**
```bash
# Apply schema updates (if needed)
# The database schema is already set up for automated chat
```

### **4. Start Server**
```bash
npm start
# or
node index.js
```

## 🔌 **API Endpoints**

### **Automated Chat Flow**
- `POST /api/bids/automated/initialize` - Initialize conversation
- `POST /api/bids/automated/brand-owner-action` - Brand owner actions
- `POST /api/bids/automated/influencer-action` - Influencer actions
- `GET /api/bids/automated/conversation/{id}/context` - Get flow context

### **Regular Chat**
- `GET /api/conversations/{id}/messages` - Get messages
- `POST /api/conversations/{id}/messages` - Send message
- `PUT /api/conversations/{id}/seen` - Mark as seen

### **User Management**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users/profile` - Get user profile

## 🎯 **Automated Chat Flow**

The system implements a **9-step automated workflow**:

1. **Connection Request** - Brand owner initiates connection
2. **Influencer Response** - Accept/reject connection
3. **Project Details** - Brand owner provides requirements
4. **Project Review** - Influencer reviews requirements
5. **Price Offer** - Brand owner makes price offer
6. **Price Response** - Influencer accepts/rejects/negotiates
7. **Negotiation Loop** - Up to 3 rounds of price negotiation
8. **Payment** - Brand owner completes payment
9. **Real-time Chat** - Transition to live conversation

## 🔧 **Key Components**

### **Automated Flow Service** (`/utils/automatedFlowService.js`)
- Handles all automated flow logic
- Manages state transitions
- Generates automated messages
- Creates audit trails

### **Controllers**
- **Bid Controller** - Handles bid-related operations
- **Campaign Controller** - Manages campaign workflows
- **Message Controller** - Handles regular messaging
- **User Controller** - User management

### **Database Schema**
- **Conversations** - Flow state, awaiting role, flow data
- **Messages** - Automated messages, audit messages, user messages
- **Users** - Brand owners, influencers, system users
- **Bids/Campaigns** - Project details and requirements

## 🚨 **Important Notes**

### **System User**
- A dedicated system user (UUID: `00000000-0000-0000-0000-000000000000`) is required
- This user sends all automated and audit messages
- Must be created in the database before using automated features

### **Flow State Management**
- The backend controls all flow state transitions
- Frontend should only display UI based on current state
- Actions are validated against current flow state

### **Message Persistence**
- All messages (automated, audit, user) are automatically saved
- Frontend doesn't need to handle message persistence
- Messages include action buttons and input fields as metadata

## 🧪 **Testing**

### **API Testing**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test conversation initialization
curl -X POST http://localhost:3000/api/bids/automated/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"bid_id":"uuid","influencer_id":"uuid","proposed_amount":5000}'
```

### **Database Testing**
```bash
# Check if system user exists
# Verify conversation flow states
# Test message creation
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"API route not found"**
   - Use correct endpoints from the API guide
   - Check route definitions in `/routes/` directory

2. **"Conversation not found"**
   - Verify conversation ID is correct
   - Check if conversation was properly initialized

3. **"Invalid UUID" errors**
   - Ensure system user exists in database
   - Check SYSTEM_USER_ID environment variable

4. **Missing automated messages**
   - Check backend logs for message creation errors
   - Verify database schema has required columns

### **Debug Commands**
```bash
# Check backend health
curl http://localhost:3000/health

# View backend logs
tail -f logs/app.log

# Check database connection
# Use Supabase dashboard or CLI
```

## 📱 **Frontend Integration**

### **Required Changes**
1. **Use correct API endpoints** (see API guide)
2. **Handle flow state changes** properly
3. **Show action buttons** based on current state
4. **Implement proper error handling**

### **Key Frontend Files**
- API service with correct endpoints
- Flow state management
- Action button rendering
- Message display with action data

## 🤝 **Contributing**

1. **Follow the existing code structure**
2. **Add tests for new features**
3. **Update documentation** for API changes
4. **Use proper error handling** and logging

## 📄 **License**

This project is proprietary software. All rights reserved.

## 🆘 **Support**

For technical issues or questions:
1. Check the documentation files
2. Review the API endpoints guide
3. Check backend logs for errors
4. Contact the backend development team

---

## 🎉 **Status: Production Ready**

The automated chat system is **fully implemented and tested**. The backend handles all business logic, flow control, and message persistence. Frontend teams can now implement the UI using the provided API guides.

**Last Updated**: August 27, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready 