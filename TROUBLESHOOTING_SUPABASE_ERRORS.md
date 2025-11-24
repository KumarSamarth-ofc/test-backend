# Troubleshooting Supabase "Internal Server Error"

## Error Description

You're seeing `{ message: 'Internal server error.' }` from Supabase when querying the `users` table. This is a generic error that can have several causes.

## Common Causes

### 1. **Missing Column in Database**
If a column referenced in the query doesn't exist, Supabase returns "Internal server error".

**Check**: Run this SQL in Supabase SQL Editor:
```sql
-- Check if 'role' column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- List all columns in users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### 2. **Database Connection Issues**
- Supabase service might be down or experiencing issues
- Network connectivity problems
- Rate limiting

**Check**: 
- Visit Supabase Dashboard → Check project status
- Check Supabase status page: https://status.supabase.com

### 3. **RLS (Row Level Security) Policies**
Even with `supabaseAdmin` (service role), RLS policies can sometimes cause issues if misconfigured.

**Check**: 
```sql
-- Check RLS policies on users table
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### 4. **Invalid User ID Format**
If the `userId` is not a valid UUID format, it can cause internal errors.

**Check**: The user ID `78d2bbbf-0af1-4e44-b879-c990431ac161` looks valid.

### 5. **Supabase Service Issues**
Temporary Supabase service problems.

## Enhanced Error Logging

I've added better error logging that will now show:
- Error code (e.g., `PGRST116` for "not found")
- Error hint (database hints)
- Full error details

## How to Debug

### Step 1: Check Enhanced Logs
After the update, check your logs for:
```
❌ Error code: ...
❌ Error hint: ...
❌ Error details: {...}
```

### Step 2: Test Direct Query
Run this in Supabase SQL Editor:
```sql
-- Test query that's failing
SELECT role 
FROM users 
WHERE id = '78d2bbbf-0af1-4e44-b879-c990431ac161';

-- Test full user query
SELECT * 
FROM users 
WHERE id = '78d2bbbf-0af1-4e44-b879-c990431ac161';
```

### Step 3: Check Environment Variables
```bash
# Verify Supabase credentials are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Step 4: Test Supabase Connection
Create a test endpoint:
```javascript
// Test endpoint to check Supabase connection
router.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .limit(1);
    
    if (error) {
      return res.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error
      });
    }
    
    return res.json({ success: true, data });
  } catch (err) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
});
```

## Quick Fixes

### If "role" column is missing:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'influencer';
```

### If connection issues:
1. Check Supabase project is active
2. Verify environment variables are correct
3. Check network/firewall settings
4. Try restarting the backend server

### If RLS is blocking:
```sql
-- Temporarily disable RLS for testing (NOT recommended for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## Next Steps

1. **Check the enhanced logs** - The new logging will show error codes and hints
2. **Run the SQL queries** above to verify database structure
3. **Check Supabase dashboard** for any service alerts
4. **Test with a simple query** to isolate the issue

The enhanced error logging will help identify the exact cause of the "Internal server error".

