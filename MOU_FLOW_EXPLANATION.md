# MOU Generation Flow - How It Works

## When MOU is Generated

MOU is automatically generated **after brand owner completes payment** in the automated flow.

## Complete Flow

### 1. Brand Owner Initiates Payment
- Brand owner agrees to price/terms in conversation
- Frontend calls payment API (Razorpay integration)
- Payment is processed

### 2. Payment Verification
- Frontend calls: `POST /api/campaigns/:id/verify-payment` or `POST /api/bids/:id/verify-payment`
- This endpoint: `CampaignController.verifyAutomatedFlowPayment()` or `BidController.verifyAutomatedFlowPayment()`
- Payment signature is verified
- Escrow is set up
- Conversation state is updated to `payment_completed`

### 3. MOU Generation (Currently Missing!)
**⚠️ ISSUE**: The `handlePaymentCompletion()` method has MOU generation code, but it's **NOT being called** from `verifyAutomatedFlowPayment()`.

**Current State**: 
- `verifyAutomatedFlowPayment()` directly updates conversation state
- It does NOT call `handlePaymentCompletion()` 
- So MOU is NOT being generated automatically

**Solution Needed**: 
- Either call `handlePaymentCompletion()` from `verifyAutomatedFlowPayment()`
- OR add MOU generation directly to `verifyAutomatedFlowPayment()`

### 4. Accessing MOU

Once MOU is generated, it can be accessed via:

**API Endpoint**: `GET /api/conversations/:id/mou`

**Response**:
```json
{
  "success": true,
  "mou_content": "Plain text MOU content...",
  "mou_html": "<html>Formatted HTML MOU...</html>",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Access Control**:
- Only brand owner, influencer, or admin can access
- If MOU doesn't exist but payment is completed, it will be generated on-the-fly

## Database Storage

MOU is stored in `mou_documents` table:
- `conversation_id` (UNIQUE - one MOU per conversation)
- `mou_content` (plain text)
- `mou_html` (HTML formatted)
- `generated_at` (timestamp)

## Setup Required

1. **Run SQL Migration**: 
   ```sql
   -- Run: database/create_mou_documents_table.sql
   ```

2. **Fix Integration**: 
   - Add MOU generation to `verifyAutomatedFlowPayment()` methods
   - OR call `handlePaymentCompletion()` which already has MOU generation

## Current Status

❌ **MOU is NOT being generated automatically** because `handlePaymentCompletion()` is not called.

✅ **MOU API endpoint works** - will generate on-the-fly if payment is completed but MOU doesn't exist.

