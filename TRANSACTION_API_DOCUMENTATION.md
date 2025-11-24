# Transaction API Documentation

## Overview

The Transaction API provides access to user transaction history with comprehensive filtering and pagination support. By default, it returns **ALL transaction types** (credit, debit, freeze, unfreeze) - filters are optional and only applied when explicitly provided.

---

## Endpoint

### Get Transaction History

**Endpoint:** `GET /api/enhanced-wallet/transactions`

**Base URL:** `/api/enhanced-wallet/transactions`

**Authentication:** Required (Bearer Token)

**Content-Type:** `application/json`

---

## Query Parameters

All query parameters are **optional**. If no parameters are provided, the API returns all transactions for the authenticated user.

| Parameter | Type | Required | Default | Description | Example Values |
|-----------|------|----------|---------|-------------|----------------|
| `page` | number | No | 1 | Page number for pagination | `1`, `2`, `3` |
| `limit` | number | No | 20 | Number of transactions per page | `10`, `20`, `50` |
| `type` | string | No | - | Filter by transaction type | `credit`, `debit`, `freeze`, `unfreeze` |
| `direction` | string | No | - | Filter by money flow direction | `credit`, `debit` |
| `status` | string | No | - | Filter by transaction status | `pending`, `completed`, `failed` |
| `conversation_id` | UUID | No | - | Filter by specific conversation | `uuid-string` |

---

## Default Behavior

### ✅ Returns ALL Transaction Types

When called without any filters, the API returns **all transaction types**:

- ✅ **Credit** - Money added to wallet (payments received, advance payments)
- ✅ **Debit** - Money deducted from wallet (payments sent, withdrawals)
- ✅ **Freeze** - Money frozen in escrow (funds held for work completion)
- ✅ **Unfreeze** - Money released from escrow (escrow funds released)

**Example:**
```http
GET /api/enhanced-wallet/transactions?page=1&limit=20
```

This returns all transaction types sorted by most recent first.

---

## Request Examples

### 1. Get All Transactions (Default)

Returns all transaction types for the user.

```http
GET /api/enhanced-wallet/transactions?page=1&limit=20
Authorization: Bearer <token>
```

**Response:** All transactions (credit, debit, freeze, unfreeze)

---

### 2. Filter by Transaction Type

Get only credit transactions:

```http
GET /api/enhanced-wallet/transactions?type=credit&page=1&limit=20
Authorization: Bearer <token>
```

Get only debit transactions:

```http
GET /api/enhanced-wallet/transactions?type=debit&page=1&limit=20
Authorization: Bearer <token>
```

Get only freeze transactions:

```http
GET /api/enhanced-wallet/transactions?type=freeze&page=1&limit=20
Authorization: Bearer <token>
```

Get only unfreeze transactions:

```http
GET /api/enhanced-wallet/transactions?type=unfreeze&page=1&limit=20
Authorization: Bearer <token>
```

---

### 3. Filter by Direction

Get only incoming money (credits):

```http
GET /api/enhanced-wallet/transactions?direction=credit&page=1&limit=20
Authorization: Bearer <token>
```

Get only outgoing money (debits):

```http
GET /api/enhanced-wallet/transactions?direction=debit&page=1&limit=20
Authorization: Bearer <token>
```

---

### 4. Filter by Status

Get only completed transactions (all types):

```http
GET /api/enhanced-wallet/transactions?status=completed&page=1&limit=20
Authorization: Bearer <token>
```

Get only pending transactions:

```http
GET /api/enhanced-wallet/transactions?status=pending&page=1&limit=20
Authorization: Bearer <token>
```

Get only failed transactions:

```http
GET /api/enhanced-wallet/transactions?status=failed&page=1&limit=20
Authorization: Bearer <token>
```

---

### 5. Filter by Conversation

Get transactions for a specific conversation:

```http
GET /api/enhanced-wallet/transactions?conversation_id=640b4756-a3dc-4b7d-97c5-934199c8b9af&page=1&limit=20
Authorization: Bearer <token>
```

---

### 6. Combined Filters

Get completed credit transactions:

```http
GET /api/enhanced-wallet/transactions?type=credit&status=completed&page=1&limit=20
Authorization: Bearer <token>
```

Get pending debit transactions:

```http
GET /api/enhanced-wallet/transactions?type=debit&status=pending&page=1&limit=20
Authorization: Bearer <token>
```

Get all completed transactions for a specific conversation:

```http
GET /api/enhanced-wallet/transactions?conversation_id=640b4756-a3dc-4b7d-97c5-934199c8b9af&status=completed&page=1&limit=20
Authorization: Bearer <token>
```

---

## Response Structure

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "wallet_id": "uuid",
      "user_id": "uuid",
      "amount": 10.00,
      "amount_paise": 1000,
      "type": "credit",
      "direction": "credit",
      "status": "completed",
      "stage": "verified",
      "created_at": "2025-11-24T10:00:00.000Z",
      "updated_at": "2025-11-24T10:00:00.000Z",
      "notes": "Payment received for conversation",
      "conversation_id": "uuid",
      "campaign_id": "uuid",
      "bid_id": "uuid",
      "sender_id": "uuid",
      "receiver_id": "uuid",
      "payment_stage": "advance",
      "razorpay_order_id": "order_xxx",
      "razorpay_payment_id": "pay_xxx",
      "razorpay_signature": "sig_xxx",
      "balance_after_paise": 10000,
      "frozen_balance_after_paise": 0,
      "withdrawn_balance_after_paise": 0,
      "escrow_hold_id": "uuid",
      "admin_payment_tracking_id": "uuid",
      "description": "Advance payment (30% after commission)",
      "campaign": {
        "id": "uuid",
        "title": "Campaign Title",
        "campaign_type": "type"
      },
      "bid": {
        "id": "uuid",
        "title": "Bid Title"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3,
    "has_more": true
  }
}
```

### Error Response

**Status Code:** `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Failed to fetch transaction history"
}
```

**Status Code:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Transaction Fields

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique transaction identifier |
| `wallet_id` | UUID | Associated wallet ID |
| `user_id` | UUID | User who owns the transaction |
| `amount` | Number | Amount in rupees (e.g., 10.00) |
| `amount_paise` | Number | Amount in paise (e.g., 1000) |
| `type` | String | Transaction type (see below) |
| `direction` | String | Money flow direction (see below) |
| `status` | String | Transaction status (see below) |
| `stage` | String | Processing stage (e.g., "verified", "pending") |
| `created_at` | ISO Date | Transaction creation timestamp |
| `updated_at` | ISO Date | Transaction last update timestamp |
| `notes` | String | Transaction description/notes |

### Transaction Types

| Type | Description | Example |
|------|-------------|---------|
| `credit` | Money added to wallet | Payment received, advance payment |
| `debit` | Money deducted from wallet | Payment sent, withdrawal |
| `freeze` | Money frozen in escrow | Funds held for work completion |
| `unfreeze` | Money released from escrow | Escrow funds released |

### Transaction Directions

| Direction | Description |
|-----------|-------------|
| `credit` | Money coming in (increasing balance) |
| `debit` | Money going out (decreasing balance) |

### Transaction Statuses

| Status | Description | Display Color |
|--------|-------------|---------------|
| `pending` | Transaction is pending approval/processing | Yellow/Orange |
| `completed` | Transaction successfully completed | Green |
| `failed` | Transaction failed | Red |
| `cancelled` | Transaction was cancelled | Gray |

### Related Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | UUID | Related conversation ID |
| `campaign_id` | UUID | Related campaign ID (if applicable) |
| `bid_id` | UUID | Related bid ID (if applicable) |
| `sender_id` | UUID | User who sent the payment |
| `receiver_id` | UUID | User who received the payment |
| `payment_stage` | String | Payment stage: `advance`, `final`, `received` |
| `razorpay_order_id` | String | Razorpay order ID |
| `razorpay_payment_id` | String | Razorpay payment ID |
| `balance_after_paise` | Number | Wallet balance after transaction |
| `frozen_balance_after_paise` | Number | Frozen balance after transaction |
| `campaign` | Object | Campaign details (if applicable) |
| `bid` | Object | Bid details (if applicable) |

---

## Pagination

The API supports pagination with the following response structure:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 20,        // Items per page
    "total": 50,        // Total number of transactions
    "pages": 3,         // Total number of pages
    "has_more": true    // Whether there are more pages
  }
}
```

### Pagination Examples

**Get first page:**
```http
GET /api/enhanced-wallet/transactions?page=1&limit=20
```

**Get second page:**
```http
GET /api/enhanced-wallet/transactions?page=2&limit=20
```

**Get more items per page:**
```http
GET /api/enhanced-wallet/transactions?page=1&limit=50
```

---

## Frontend Implementation Examples

### JavaScript/TypeScript

```typescript
interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit' | 'freeze' | 'unfreeze';
  direction?: 'credit' | 'debit';
  status?: 'pending' | 'completed' | 'failed';
  conversation_id?: string;
}

interface TransactionResponse {
  success: boolean;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_more: boolean;
  };
}

async function fetchTransactions(
  token: string,
  filters: TransactionFilters = {}
): Promise<TransactionResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.direction) params.append('direction', filters.direction);
  if (filters.status) params.append('status', filters.status);
  if (filters.conversation_id) params.append('conversation_id', filters.conversation_id);

  const response = await fetch(
    `/api/enhanced-wallet/transactions?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  return await response.json();
}

// Usage examples:

// Get all transactions
const allTransactions = await fetchTransactions(token);

// Get only credit transactions
const credits = await fetchTransactions(token, { type: 'credit' });

// Get completed transactions
const completed = await fetchTransactions(token, { status: 'completed' });

// Get transactions for a conversation
const conversationTxns = await fetchTransactions(token, {
  conversation_id: '640b4756-a3dc-4b7d-97c5-934199c8b9af'
});

// Get completed credits with pagination
const completedCredits = await fetchTransactions(token, {
  type: 'credit',
  status: 'completed',
  page: 1,
  limit: 20
});
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useTransactions(filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchTransactions(token, filters);
        setTransactions(data.transactions);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [filters]);

  return { transactions, pagination, loading, error };
}

// Usage in component
function TransactionList() {
  const [filters, setFilters] = useState({});
  const { transactions, pagination, loading, error } = useTransactions(filters);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <FilterControls onFilterChange={setFilters} />
      <TransactionCards transactions={transactions} />
      <Pagination pagination={pagination} onPageChange={(page) => 
        setFilters({ ...filters, page })
      } />
    </div>
  );
}
```

---

## Use Cases

### 1. Display All Transactions

Show complete transaction history to the user:

```http
GET /api/enhanced-wallet/transactions?page=1&limit=20
```

### 2. Show Only Earnings (Credits)

Display only money received:

```http
GET /api/enhanced-wallet/transactions?type=credit&status=completed
```

### 3. Show Only Payments Sent (Debits)

Display only money sent:

```http
GET /api/enhanced-wallet/transactions?type=debit&status=completed
```

### 4. Show Escrow Transactions

Display frozen and released funds:

```http
GET /api/enhanced-wallet/transactions?type=freeze
GET /api/enhanced-wallet/transactions?type=unfreeze
```

### 5. Show Pending Transactions

Display transactions awaiting completion:

```http
GET /api/enhanced-wallet/transactions?status=pending
```

### 6. Show Conversation-Specific Transactions

Display transactions for a specific conversation:

```http
GET /api/enhanced-wallet/transactions?conversation_id=uuid
```

---

## Important Notes

### ✅ Default Behavior

- **Returns ALL transaction types** when no filters are provided
- Filters are **optional** and only applied when explicitly specified
- Transactions are sorted by `created_at` in descending order (newest first)

### 🔒 Authentication

- All requests require a valid Bearer token
- Token should be included in the `Authorization` header
- Unauthenticated requests will return `401 Unauthorized`

### 📊 Pagination

- Default page size is 20 transactions
- Maximum recommended page size is 100
- Use `has_more` flag to determine if more pages exist

### 🎯 Filtering

- Multiple filters can be combined
- Filters are applied with AND logic (all conditions must match)
- Empty or undefined filter values are ignored

### ⚡ Performance

- The API includes retry logic for transient errors
- Queries are optimized with proper database joins
- Response includes only necessary data

---

## Error Handling

### Common Errors

| Status Code | Error | Solution |
|-------------|-------|----------|
| 401 | Unauthorized | Include valid Bearer token |
| 500 | Internal Server Error | Check server logs, retry request |
| 400 | Bad Request | Verify query parameters are valid |

### Retry Logic

The API automatically retries failed requests up to 3 times with exponential backoff. If all retries fail, an error is returned.

---

## Rate Limiting

Currently, there are no rate limits on this endpoint. However, it's recommended to:

- Cache responses when possible
- Use pagination to limit response size
- Avoid making excessive requests in short time periods

---

## Support

For issues or questions about this API, please contact the development team or refer to the main API documentation.

---

**Last Updated:** November 24, 2025  
**API Version:** 1.0

