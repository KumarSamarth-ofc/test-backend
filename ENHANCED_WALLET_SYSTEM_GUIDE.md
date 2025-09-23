# Enhanced Wallet System Guide

## Overview

The enhanced wallet system provides comprehensive tracking of all financial transactions with proper balance breakdown and transaction history. This system maintains backward compatibility while adding advanced features for better financial management.

## Key Features

### 1. **Comprehensive Balance Tracking**
- **Available Balance**: Money that can be withdrawn or used
- **Frozen Balance**: Money held in escrow
- **Withdrawn Balance**: Money that has been withdrawn by the user
- **Total Balance**: Sum of all above components

### 2. **Enhanced Transaction Types**
- `payment_received`: Money received from brand owners
- `payment_sent`: Money sent by brand owners (debit tracking)
- `withdrawal`: Money withdrawn by users
- `escrow_hold`: Money frozen in escrow
- `escrow_release`: Money released from escrow
- `refund`: Money refunded
- `commission`: Platform commission
- `bonus`: Bonus payments

### 3. **Proper Debit Tracking**
- Brand owner payments are now properly tracked as debits
- Each payment includes conversation context
- Transaction history shows complete financial flow

## Database Schema Changes

### New Columns in `wallets` Table
```sql
ALTER TABLE wallets 
ADD COLUMN withdrawn_balance_paise INTEGER DEFAULT 0,
ADD COLUMN total_balance_paise INTEGER DEFAULT 0;
```

### Enhanced `transactions` Table
```sql
ALTER TABLE transactions 
ADD COLUMN withdrawal_id VARCHAR(255),
ADD COLUMN related_conversation_id UUID REFERENCES conversations(id),
ADD COLUMN related_escrow_hold_id UUID REFERENCES escrow_holds(id),
ADD COLUMN balance_after_paise INTEGER,
ADD COLUMN frozen_balance_after_paise INTEGER,
ADD COLUMN withdrawn_balance_after_paise INTEGER;
```

## API Endpoints

### 1. Get Wallet Balance
```http
GET /api/enhanced-wallet/balance
```

**Response:**
```json
{
  "success": true,
  "wallet": {
    "id": "uuid",
    "user_id": "uuid",
    "balance_paise": 50000,
    "frozen_balance_paise": 20000,
    "withdrawn_balance_paise": 10000,
    "total_balance_paise": 80000,
    "available_balance_rupees": 500.00,
    "frozen_balance_rupees": 200.00,
    "withdrawn_balance_rupees": 100.00,
    "total_balance_rupees": 800.00
  },
  "balance_summary": {
    "available": 50000,
    "frozen": 20000,
    "withdrawn": 10000,
    "total": 80000
  }
}
```

### 2. Process Withdrawal
```http
POST /api/enhanced-wallet/withdraw
Content-Type: application/json

{
  "amount": 100.00,
  "method": "bank_transfer",
  "bank_details": {
    "account_number": "1234567890",
    "ifsc_code": "SBIN0001234"
  },
  "notes": "Withdrawal request"
}
```

### 3. Get Transaction History
```http
GET /api/enhanced-wallet/transactions?page=1&limit=20&type=withdrawal&direction=debit
```

### 4. Get Transaction Summary
```http
GET /api/enhanced-wallet/summary?days=30
```

### 5. Get Wallet Breakdown
```http
GET /api/enhanced-wallet/breakdown
```

## Balance Calculation Logic

### Total Balance Formula
```
Total Balance = Available Balance + Frozen Balance + Withdrawn Balance
```

### Available Balance
```
Available Balance = Total Balance - Frozen Balance - Withdrawn Balance
```

### Balance Components
1. **Available Balance**: Money user can withdraw or spend
2. **Frozen Balance**: Money held in escrow for active collaborations
3. **Withdrawn Balance**: Money already withdrawn by user
4. **Total Balance**: Complete financial position

## Transaction Flow Examples

### 1. Brand Owner Payment Flow
```
1. Brand owner initiates payment → payment_sent (debit)
2. Influencer receives payment → payment_received (credit)
3. Payment goes to escrow → escrow_hold (freeze)
4. Work completed → escrow_release (unfreeze)
5. Influencer withdraws → withdrawal (debit)
```

### 2. Withdrawal Flow
```
1. User requests withdrawal → withdrawal (debit)
2. Available balance decreases
3. Withdrawn balance increases
4. Total balance remains same
```

## Integration with Existing System

### 1. **Backward Compatibility**
- All existing APIs continue to work
- Legacy balance fields are maintained
- Old transaction types are preserved

### 2. **Enhanced Automated Flow**
- Brand owner debits are properly tracked
- Escrow holds use enhanced balance service
- Payment verification includes comprehensive tracking

### 3. **Socket Integration**
- Real-time balance updates
- Transaction notifications
- Escrow status changes

## Usage Examples

### 1. Get User's Complete Financial Status
```javascript
const response = await fetch('/api/enhanced-wallet/breakdown');
const data = await response.json();

console.log('Available:', data.balance_summary.available_rupees);
console.log('Frozen:', data.balance_summary.frozen_rupees);
console.log('Withdrawn:', data.balance_summary.withdrawn_rupees);
console.log('Total:', data.balance_summary.total_rupees);
```

### 2. Process Withdrawal
```javascript
const withdrawal = await fetch('/api/enhanced-wallet/withdraw', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 500.00,
    method: 'bank_transfer',
    notes: 'Monthly withdrawal'
  })
});
```

### 3. Get Transaction History
```javascript
const history = await fetch('/api/enhanced-wallet/transactions?type=withdrawal&limit=10');
const transactions = await history.json();
```

## Migration Guide

### 1. **Database Migration**
Run the SQL script to add new columns:
```bash
psql -d your_database -f database/enhance_wallet_system.sql
```

### 2. **Update Existing Wallets**
The migration script automatically updates existing wallets with proper totals.

### 3. **API Integration**
Replace old wallet endpoints with enhanced ones:
- `GET /api/wallet/balance` → `GET /api/enhanced-wallet/balance`
- Add new endpoints for withdrawals and detailed history

## Security Considerations

### 1. **Transaction Validation**
- All amounts validated before processing
- Duplicate transaction prevention
- Signature verification for payments

### 2. **Balance Integrity**
- Atomic transactions ensure consistency
- Triggers maintain balance accuracy
- Audit trail for all changes

### 3. **Access Control**
- User can only access their own wallet
- Admin endpoints for support
- Rate limiting on withdrawal requests

## Monitoring and Analytics

### 1. **Balance Tracking**
- Real-time balance calculations
- Historical balance trends
- Escrow hold monitoring

### 2. **Transaction Analytics**
- Transaction volume analysis
- Withdrawal patterns
- Escrow release timing

### 3. **Performance Metrics**
- API response times
- Database query optimization
- Error rate monitoring

## Troubleshooting

### 1. **Balance Discrepancies**
- Check transaction history
- Verify escrow holds
- Run balance recalculation

### 2. **Withdrawal Issues**
- Verify available balance
- Check withdrawal limits
- Review transaction status

### 3. **Escrow Problems**
- Check conversation status
- Verify work completion
- Review release conditions

## Future Enhancements

### 1. **Advanced Features**
- Automated withdrawal scheduling
- Multi-currency support
- Advanced analytics dashboard

### 2. **Integration Improvements**
- Webhook notifications
- Third-party payment gateways
- Mobile app optimization

### 3. **Security Enhancements**
- Two-factor authentication
- Advanced fraud detection
- Compliance reporting

## Support

For technical support or questions about the enhanced wallet system:
1. Check the API documentation
2. Review transaction logs
3. Contact the development team

---

**Note**: This enhanced wallet system maintains full backward compatibility while providing comprehensive financial tracking and management capabilities.
