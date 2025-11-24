# MOU Testing Guide

## How to Test MOU Generation

Since MOU generation fetches all data from the database, here's how to test it:

## 1. Preview MOU Data (Recommended First Step)

**Endpoint**: `GET /api/conversations/:conversationId/mou/preview`

**Purpose**: Shows all data that will be used to generate the MOU without actually generating it.

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/conversations/{conversationId}/mou/preview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "preview": {
    "conversation_id": "...",
    "brand_owner": {
      "id": "...",
      "name": "Brand Owner Name",
      "email": "brand@example.com",
      "phone": "+919876543210",
      "brand_name": "Brand Name"
    },
    "influencer": {
      "id": "...",
      "name": "Influencer Name",
      "email": "influencer@example.com",
      "phone": "+919876543211"
    },
    "collaboration": {
      "type": "Campaign",
      "title": "Campaign Title",
      "description": "Campaign Description",
      "total_amount": 10000
    },
    "payment_breakdown": {
      "totalAmount": 10000,
      "netAmount": 9000,
      "commissionAmount": 1000,
      "commissionPercentage": 10,
      "advanceAmount": 2700,
      "finalAmount": 6300
    },
    "conversation_created_at": "2024-01-15T10:00:00Z",
    "flow_data": {...}
  },
  "can_generate": true,
  "missing_data": {
    "brand_owner": false,
    "influencer": false,
    "collaboration_title": false,
    "payment_amount": false
  }
}
```

**What to Check**:
- ✅ All required data is present (`can_generate: true`)
- ✅ Brand owner details are correct
- ✅ Influencer details are correct
- ✅ Collaboration title and description are present
- ✅ Payment breakdown is calculated correctly
- ❌ If `missing_data` shows any `true` values, fix those first

## 2. Test MOU Generation (Admin Only)

**Endpoint**: `POST /api/conversations/:conversationId/mou/test`

**Purpose**: Manually trigger MOU generation for testing (admin only).

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/conversations/{conversationId}/mou/test" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "MOU generated successfully",
  "mou_content": "MEMORANDUM OF UNDERSTANDING...",
  "mou_html": "<html>...",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

## 3. Get Generated MOU

**Endpoint**: `GET /api/conversations/:conversationId/mou`

**Purpose**: Retrieve the generated MOU (or generate on-the-fly if payment completed but MOU missing).

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/conversations/{conversationId}/mou" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 4. Check Server Logs

The MOU service logs detailed information about what data is fetched:

```
📋 [MOU] Fetched conversation data: {...}
💰 [MOU] Payment breakdown: {...}
✅ [MOU] MOU generated successfully for conversation {id}
```

**Watch for warnings**:
- `⚠️ [MOU] Brand owner data missing`
- `⚠️ [MOU] Influencer data missing`
- `⚠️ [MOU] Collaboration title missing`
- `⚠️ [MOU] Payment amount is 0`

## Testing Checklist

### Before Testing:
- [ ] Run SQL migration: `database/create_mou_documents_table.sql`
- [ ] Ensure conversation exists with:
  - [ ] Brand owner (user with `brand_owner_id`)
  - [ ] Influencer (user with `influencer_id`)
  - [ ] Campaign or Bid linked
  - [ ] Payment completed (`flow_data.payment_completed = true` OR `flow_state = 'payment_completed'`)
  - [ ] Payment amount in `flow_data.agreed_amount` OR `admin_payment_tracking` record

### Test Steps:
1. **Preview Data**: Call `/mou/preview` to verify all data is available
2. **Check Missing Data**: Review `missing_data` object in preview response
3. **Fix Missing Data**: Update conversation/campaign/bid/user data if needed
4. **Test Generation**: Call `/mou/test` (admin only) to generate MOU
5. **Verify MOU**: Call `/mou` to retrieve and verify the generated MOU
6. **Check Database**: Verify MOU is saved in `mou_documents` table

## Common Issues

### Issue: "MOU can only be generated after payment is completed"
**Solution**: Ensure conversation has:
- `flow_data.payment_completed = true` OR
- `flow_state = 'payment_completed'` OR
- `flow_state = 'work_in_progress'` OR
- `flow_state = 'work_submitted'` OR
- `flow_state = 'work_approved'`

### Issue: Payment amount is 0
**Solution**: Ensure one of:
- `admin_payment_tracking` record exists for conversation
- `flow_data.agreed_amount` is set in conversation

### Issue: Brand owner/Influencer data missing
**Solution**: 
- Check if users exist in `users` table
- Verify foreign key relationships are correct
- Check if users are not deleted (`is_deleted = false`)

### Issue: Collaboration title missing
**Solution**:
- Ensure `campaign_id` or `bid_id` is set in conversation
- Verify campaign/bid exists and has `title` field

## Example Test Flow

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999","otp":"123456"}' | jq -r '.token')

# 2. Preview MOU data
curl -X GET "http://localhost:3000/api/conversations/{conversationId}/mou/preview" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Test MOU generation (admin only)
curl -X POST "http://localhost:3000/api/conversations/{conversationId}/mou/test" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Get generated MOU
curl -X GET "http://localhost:3000/api/conversations/{conversationId}/mou" \
  -H "Authorization: Bearer $TOKEN" | jq '.mou_content'
```

## Database Verification

Check if MOU was saved:
```sql
SELECT 
  id,
  conversation_id,
  LENGTH(mou_content) as content_length,
  LENGTH(mou_html) as html_length,
  generated_at
FROM mou_documents
WHERE conversation_id = '{conversationId}';
```

