# Transaction Display Guide

This guide explains how to fetch and display transactions in your application.

## Available Endpoints

### 1. Enhanced Wallet Transactions (Recommended)
**Endpoint:** `GET /api/enhanced-wallet/transactions`

**Features:**
- Uses `transactions` table with proper joins to wallets, campaigns, and bids
- Supports filtering by type, direction, status, and conversation_id
- Better error handling with retry logic
- More comprehensive transaction data with flattened response structure

**Example Request:**
```javascript
GET /api/enhanced-wallet/transactions?page=1&limit=20&type=credit&status=completed
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `type` (optional) - Filter by transaction type: `credit`, `debit`, `freeze`, `unfreeze`
- `direction` (optional) - Filter by direction: `credit`, `debit`
- `status` (optional) - Filter by status: `pending`, `completed`, `failed`
- `conversation_id` (optional) - Filter by specific conversation

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "wallet_id": "uuid",
      "amount": 10.00,
      "amount_paise": 1000,
      "type": "credit",
      "direction": "credit",
      "status": "completed",
      "stage": "verified",
      "created_at": "2025-11-24T10:00:00Z",
      "notes": "Payment received for conversation",
      "conversation_id": "uuid",
      "campaign_id": "uuid",
      "bid_id": "uuid",
      "sender_id": "uuid",
      "receiver_id": "uuid",
      "payment_stage": "advance",
      "razorpay_order_id": "order_xxx",
      "razorpay_payment_id": "pay_xxx"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_more": true
  }
}
```

### 2. Payment Service Transactions (Legacy)
**Endpoint:** `GET /api/payments/transactions`

**Features:**
- Includes campaign information
- Basic filtering by status
- Uses direct transactions table

**Example Request:**
```javascript
GET /api/payments/transactions?page=1&limit=10&status=completed
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": 10.00,
      "amount_paise": 1000,
      "type": "credit",
      "direction": "credit",
      "status": "completed",
      "created_at": "2025-11-24T10:00:00Z",
      "wallets": {
        "user_id": "uuid"
      },
      "campaigns": {
        "id": "uuid",
        "title": "Campaign Title",
        "type": "campaign_type"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## Transaction Data Structure

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique transaction identifier |
| `user_id` | UUID | User who owns the transaction |
| `wallet_id` | UUID | Associated wallet |
| `amount` | Number | Amount in rupees (e.g., 10.00) |
| `amount_paise` | Number | Amount in paise (e.g., 1000) |
| `type` | String | Transaction type (see below) |
| `direction` | String | Money flow direction (see below) |
| `status` | String | Transaction status (see below) |
| `stage` | String | Processing stage (e.g., "verified", "pending") |
| `created_at` | ISO Date | Transaction timestamp |
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

### Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | UUID | Related conversation |
| `campaign_id` | UUID | Related campaign (if applicable) |
| `bid_id` | UUID | Related bid (if applicable) |
| `sender_id` | UUID | User who sent the payment |
| `receiver_id` | UUID | User who received the payment |
| `payment_stage` | String | Payment stage: `advance`, `final`, `received` |
| `razorpay_order_id` | String | Razorpay order ID |
| `razorpay_payment_id` | String | Razorpay payment ID |
| `balance_after_paise` | Number | Wallet balance after transaction |
| `frozen_balance_after_paise` | Number | Frozen balance after transaction |

## Frontend Implementation Guide

### 1. Fetching Transactions

```javascript
// Using Enhanced Wallet endpoint (Recommended)
async function fetchTransactions(page = 1, filters = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...filters
  });
  
  const response = await fetch(
    `/api/enhanced-wallet/transactions?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data;
}

// Example usage
const transactions = await fetchTransactions(1, {
  type: 'credit',
  status: 'completed'
});
```

### 2. Displaying Transaction List

```javascript
function TransactionList({ transactions }) {
  return (
    <div className="transaction-list">
      {transactions.map(transaction => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}

function TransactionCard({ transaction }) {
  const isCredit = transaction.direction === 'credit';
  const statusColor = getStatusColor(transaction.status);
  
  return (
    <div className="transaction-card">
      <div className="transaction-header">
        <span className={`amount ${isCredit ? 'credit' : 'debit'}`}>
          {isCredit ? '+' : '-'}₹{transaction.amount.toFixed(2)}
        </span>
        <span className={`status status-${transaction.status}`}>
          {transaction.status}
        </span>
      </div>
      
      <div className="transaction-details">
        <p className="notes">{transaction.notes || 'No description'}</p>
        <p className="date">
          {formatDate(transaction.created_at)}
        </p>
        {transaction.campaign_id && (
          <p className="campaign">Campaign: {transaction.campaigns?.title}</p>
        )}
      </div>
      
      <div className="transaction-meta">
        <span className="type">{transaction.type}</span>
        {transaction.payment_stage && (
          <span className="stage">{transaction.payment_stage}</span>
        )}
      </div>
    </div>
  );
}
```

### 3. Formatting Amounts

```javascript
function formatAmount(amountPaise) {
  // Convert paise to rupees
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(rupees);
}

// Usage
formatAmount(1000); // ₹10.00
formatAmount(100);  // ₹1.00
```

### 4. Status Badge Component

```javascript
function StatusBadge({ status }) {
  const statusConfig = {
    completed: { color: 'green', label: 'Completed', icon: '✓' },
    pending: { color: 'yellow', label: 'Pending', icon: '⏳' },
    failed: { color: 'red', label: 'Failed', icon: '✗' },
    cancelled: { color: 'gray', label: 'Cancelled', icon: '⊘' }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`badge badge-${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}
```

### 5. Filtering Transactions

```javascript
function TransactionFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    type: '',
    direction: '',
    status: ''
  });
  
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  return (
    <div className="filters">
      <select 
        value={filters.type} 
        onChange={(e) => handleFilterChange('type', e.target.value)}
      >
        <option value="">All Types</option>
        <option value="credit">Credit</option>
        <option value="debit">Debit</option>
        <option value="freeze">Freeze</option>
        <option value="unfreeze">Unfreeze</option>
      </select>
      
      <select 
        value={filters.direction} 
        onChange={(e) => handleFilterChange('direction', e.target.value)}
      >
        <option value="">All Directions</option>
        <option value="credit">Incoming</option>
        <option value="debit">Outgoing</option>
      </select>
      
      <select 
        value={filters.status} 
        onChange={(e) => handleFilterChange('status', e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>
    </div>
  );
}
```

### 6. Pagination

```javascript
function TransactionPagination({ pagination, onPageChange }) {
  const { page, limit, has_more } = pagination;
  
  return (
    <div className="pagination">
      <button 
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      
      <span>Page {page}</span>
      
      <button 
        disabled={!has_more}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
```

### 7. Complete Example Component

```javascript
function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, has_more: false });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  
  const fetchTransactions = async (page, filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });
      
      const response = await fetch(
        `/api/enhanced-wallet/transactions?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTransactions(pagination.page, filters);
  }, [pagination.page, filters]);
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };
  
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };
  
  return (
    <div className="transactions-page">
      <h1>Transaction History</h1>
      
      <TransactionFilters onFilterChange={handleFilterChange} />
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <TransactionList transactions={transactions} />
          <TransactionPagination 
            pagination={pagination} 
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
```

## Transaction Display Best Practices

### 1. Amount Display
- Always show amounts in rupees (divide `amount_paise` by 100)
- Use `+` for credits and `-` for debits
- Format with 2 decimal places: `₹10.00`
- Use green for credits, red for debits

### 2. Status Indicators
- Use color-coded badges for status
- Show icons for quick recognition
- Tooltip with full status description

### 3. Date Formatting
- Show relative time for recent transactions: "2 hours ago"
- Show full date for older transactions: "Nov 24, 2025"
- Include time for same-day transactions

### 4. Transaction Details
- Show transaction notes/description prominently
- Link to related campaign/bid if available
- Show payment stage (advance/final) for payment transactions
- Display Razorpay IDs for payment verification

### 5. Grouping
- Group by date (Today, Yesterday, This Week, etc.)
- Group by type (Credits, Debits, Escrow)
- Group by status (Completed, Pending, Failed)

### 6. Empty States
- Show helpful message when no transactions
- Provide action to create first transaction
- Show filter suggestions

## Error Handling

```javascript
async function fetchTransactionsWithRetry(page, filters, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(...);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Summary

- **Use `/api/enhanced-wallet/transactions`** for better performance and features
- **Filter by**: type, direction, status, conversation_id
- **Paginate** with page and limit parameters
- **Display**: amount in rupees, status badges, formatted dates
- **Handle errors** with retry logic
- **Group transactions** by date, type, or status for better UX

