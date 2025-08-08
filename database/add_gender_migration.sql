-- Migration: Add gender and name columns to users table
-- Run this script to add gender and name fields to existing databases

-- Add name column
ALTER TABLE users 
ADD COLUMN name TEXT;


-- Add indexes for better performance
CREATE INDEX idx_users_name ON users(name);
-- (The existing trigger should already handle this automatically) 