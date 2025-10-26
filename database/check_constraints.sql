-- Check current constraints on conversations table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'conversations'::regclass 
AND contype = 'c'
ORDER BY conname;
