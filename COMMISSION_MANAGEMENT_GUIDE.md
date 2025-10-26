# Commission Management System Guide

## Overview

The Commission Management System provides dynamic commission control with transparent pricing display throughout the automated flow. Both brand owners and influencers can see complete payment breakdowns including platform fees, net amounts, and payment schedules.

## Features

- **Dynamic Commission Management**: Admin can update commission percentage via API
- **Transparent Pricing**: Complete breakdowns shown in all price-related messages
- **Consistent Display**: Standardized format across all automated flow interactions
- **Database Integration**: Uses existing `commission_settings` table
- **Backward Compatibility**: Maintains existing functionality while adding transparency

## API Endpoints

### Commission Settings Management

#### Get Current Commission Rate
```http
GET /api/admin/commission/current
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "commission_percentage": 10.00,
    "effective_from": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Commission Percentage
```http
PUT /api/admin/commission/update
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "commission_percentage": 12.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Commission percentage updated successfully",
  "data": {
    "id": "uuid",
    "commission_percentage": 12.5,
    "effective_from": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Commission History
```http
GET /api/admin/commission/history?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "commission_percentage": 12.5,
      "is_active": true,
      "effective_from": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

## Database Schema

### Commission Settings Table
```sql
CREATE TABLE commission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Points:**
- Only one active commission setting at a time
- Historical records maintained for audit trail
- Commission percentage supports up to 2 decimal places
- Default commission rate is 10%

## Payment Breakdown Structure

### Display Format
All price-related messages now include formatted breakdowns:

```
💰 **Price Offer: ₹5000**

📊 **Payment Breakdown:**
• Total Amount: ₹5000.00
• Platform Fee: ₹500.00 (10%)
• You'll Receive: ₹4500.00

💳 **Payment Schedule:**
• Advance (30%): ₹1350.00
• Final (70%): ₹3150.00
```

### Action Data Structure
```javascript
action_data: {
  title: "🎯 **Price Offer Response**",
  subtitle: "Choose how you'd like to respond to this price offer:",
  buttons: [...],
  // Payment breakdown data
  payment_breakdown: {
    total_amount: 500000,        // in paise
    commission_amount: 50000,    // in paise
    commission_percentage: 10.00,
    net_amount: 450000,          // in paise
    advance_amount: 135000,     // in paise (30%)
    final_amount: 315000,       // in paise (70%)
    display: {
      total: "₹5000.00",
      commission: "₹500.00 (10%)",
      net_to_influencer: "₹4500.00",
      advance: "₹1350.00 (30%)",
      final: "₹3150.00 (70%)"
    }
  },
  flow_state: "influencer_price_response",
  message_type: "influencer_price_response",
  visible_to: "influencer"
}
```

## Automated Flow Integration

### Brand Owner Actions

#### 1. Send Price Offer (`send_price_offer`)
- **Trigger**: Brand owner sends initial price offer
- **Display**: Shows complete breakdown to influencer
- **Action Data**: Includes payment breakdown for frontend processing

#### 2. Send Negotiated Price (`send_negotiated_price`)
- **Trigger**: Brand owner responds to negotiation
- **Display**: Shows updated breakdown to influencer
- **Action Data**: Includes payment breakdown for frontend processing

#### 3. Make Final Offer (`make_final_offer`)
- **Trigger**: Brand owner makes final offer
- **Display**: Shows final breakdown to influencer
- **Action Data**: Includes payment breakdown for frontend processing

### Influencer Actions

#### 1. Accept Price (`accept_price`)
- **Trigger**: Influencer accepts price offer
- **Display**: Shows breakdown to brand owner
- **Action Data**: Includes payment breakdown for frontend processing

#### 2. Send Counter Offer (`send_counter_offer`)
- **Trigger**: Influencer makes counter offer
- **Display**: Shows breakdown to brand owner
- **Action Data**: Includes payment breakdown for frontend processing

#### 3. Accept Negotiated Price (`accept_negotiated_price`)
- **Trigger**: Influencer accepts negotiated price
- **Display**: Shows breakdown to brand owner
- **Action Data**: Includes payment breakdown for frontend processing

#### 4. Accept Final Offer (`accept_final_offer`)
- **Trigger**: Influencer accepts final offer
- **Display**: Shows breakdown to brand owner
- **Action Data**: Includes payment breakdown for frontend processing

### Payment Actions

#### 1. Proceed to Payment (`proceed_to_payment`)
- **Trigger**: Brand owner initiates payment
- **Display**: Shows complete breakdown before payment
- **Action Data**: Includes payment breakdown and Razorpay configuration

#### 2. Payment Completion (`handlePaymentCompletion`)
- **Trigger**: Payment is successfully processed
- **Display**: Shows breakdown in confirmation message
- **Action Data**: Confirmation with payment details

## Frontend Integration

### Displaying Payment Breakdowns

#### Message Display
```javascript
// Access payment breakdown from message action_data
const message = {
  message: "💰 **Price Offer: ₹5000**\n\n📊 **Payment Breakdown:**...",
  action_data: {
    payment_breakdown: {
      display: {
        total: "₹5000.00",
        commission: "₹500.00 (10%)",
        net_to_influencer: "₹4500.00",
        advance: "₹1350.00 (30%)",
        final: "₹3150.00 (70%)"
      }
    }
  }
};

// Display breakdown in UI
const breakdown = message.action_data.payment_breakdown.display;
console.log(`Total: ${breakdown.total}`);
console.log(`Commission: ${breakdown.commission}`);
console.log(`Net Amount: ${breakdown.net_to_influencer}`);
```

#### Action Button Handling
```javascript
// Handle price-related actions with breakdown data
const handlePriceAction = (actionData) => {
  if (actionData.payment_breakdown) {
    const breakdown = actionData.payment_breakdown;
    
    // Show breakdown in UI
    showPaymentBreakdown({
      total: breakdown.display.total,
      commission: breakdown.display.commission,
      netAmount: breakdown.display.net_to_influencer,
      advance: breakdown.display.advance,
      final: breakdown.display.final
    });
  }
  
  // Process the action
  processAction(actionData);
};
```

### Admin Panel Integration

#### Commission Management
```javascript
// Get current commission rate
const getCurrentCommission = async () => {
  const response = await fetch('/api/admin/commission/current', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return response.json();
};

// Update commission rate
const updateCommission = async (percentage) => {
  const response = await fetch('/api/admin/commission/update', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ commission_percentage: percentage })
  });
  return response.json();
};
```

## Implementation Details

### Files Modified

1. **`controllers/commissionSettingsController.js`** (New)
   - Handles commission CRUD operations
   - Validates commission percentage (0-100)
   - Maintains historical records

2. **`routes/commissionSettings.js`** (New)
   - Defines API endpoints for commission management
   - Applies admin authentication middleware

3. **`utils/automatedFlowService.js`** (Modified)
   - Enhanced `calculatePaymentBreakdown()` with display strings
   - Updated all price-related message cases
   - Added payment breakdown to action_data

4. **`index.js`** (Modified)
   - Registered commission settings routes

### Key Functions

#### `calculatePaymentBreakdown(agreedAmount)`
```javascript
async calculatePaymentBreakdown(agreedAmount) {
  // Get current commission settings
  const { data: commissionSettings } = await supabaseAdmin
    .from("commission_settings")
    .select("*")
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();

  const commissionPercentage = commissionSettings?.commission_percentage || 10.00;
  
  // Calculate amounts
  const totalAmountPaise = Math.round(agreedAmount * 100);
  const commissionAmountPaise = Math.round((totalAmountPaise * commissionPercentage) / 100);
  const netAmountPaise = totalAmountPaise - commissionAmountPaise;
  const advanceAmountPaise = Math.round(netAmountPaise * 0.30);
  const finalAmountPaise = netAmountPaise - advanceAmountPaise;

  return {
    total_amount_paise: totalAmountPaise,
    commission_amount_paise: commissionAmountPaise,
    net_amount_paise: netAmountPaise,
    advance_amount_paise: advanceAmountPaise,
    final_amount_paise: finalAmountPaise,
    commission_percentage: commissionPercentage,
    display: {
      total: `₹${(totalAmountPaise / 100).toFixed(2)}`,
      commission: `₹${(commissionAmountPaise / 100).toFixed(2)} (${commissionPercentage}%)`,
      net_to_influencer: `₹${(netAmountPaise / 100).toFixed(2)}`,
      advance: `₹${(advanceAmountPaise / 100).toFixed(2)} (30%)`,
      final: `₹${(finalAmountPaise / 100).toFixed(2)} (70%)`
    }
  };
}
```

## Testing

### Test Scenarios

1. **Commission Rate Updates**
   - Admin updates commission percentage
   - New rate applies to new conversations
   - Old conversations use rate at time of agreement

2. **Price Message Display**
   - All price messages show correct breakdowns
   - Both brand owner and influencer see breakdowns
   - Breakdowns match calculated amounts

3. **Payment Processing**
   - Payment amounts use correct net amounts
   - Commission is properly deducted
   - Payment schedules are accurate

4. **End-to-End Flow**
   - Price offer → negotiation → acceptance → payment
   - All steps show consistent breakdowns
   - Final payment amounts are correct

### Test Commands

```bash
# Test commission API
curl -X GET http://localhost:3000/api/admin/commission/current \
  -H "Authorization: Bearer <admin_token>"

curl -X PUT http://localhost:3000/api/admin/commission/update \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"commission_percentage": 12.5}'
```

## Security Considerations

1. **Admin Authentication**: All commission management endpoints require admin role
2. **Input Validation**: Commission percentage must be between 0-100
3. **Historical Records**: Commission changes are logged for audit trail
4. **Rate Limiting**: Consider implementing rate limiting for commission updates

## Migration Notes

1. **Database**: Ensure `commission_settings` table exists (from `admin_payment_flow_migration.sql`)
2. **Default Commission**: System defaults to 10% if no active commission setting found
3. **Backward Compatibility**: Existing conversations continue to work with current logic
4. **Frontend Updates**: Frontend should handle new `payment_breakdown` field in action_data

## Troubleshooting

### Common Issues

1. **Commission Not Updating**
   - Check if admin authentication is working
   - Verify commission percentage is valid (0-100)
   - Ensure database connection is active

2. **Breakdown Not Displaying**
   - Check if `payment_breakdown` exists in action_data
   - Verify `calculatePaymentBreakdown()` is being called
   - Ensure frontend is reading the breakdown data

3. **Payment Amounts Incorrect**
   - Verify commission percentage in database
   - Check if breakdown calculation is using correct amount
   - Ensure paise conversion is accurate

### Debug Commands

```javascript
// Check current commission
const { data } = await supabaseAdmin
  .from("commission_settings")
  .select("*")
  .eq("is_active", true)
  .single();
console.log("Current commission:", data);

// Test breakdown calculation
const breakdown = await automatedFlowService.calculatePaymentBreakdown(5000);
console.log("Breakdown:", breakdown);
```

## Future Enhancements

1. **Tiered Commission**: Different rates based on transaction amount
2. **Category-Based Rates**: Different rates for different campaign types
3. **Time-Based Rates**: Promotional periods with different rates
4. **Commission Analytics**: Dashboard showing commission trends
5. **Automated Rate Updates**: Scheduled commission changes

## Support

For issues or questions regarding the Commission Management System:

1. Check this guide for common solutions
2. Review the implementation files for details
3. Test with the provided test scenarios
4. Contact the development team for complex issues

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Status**: Production Ready
