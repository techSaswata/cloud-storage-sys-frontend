-- ============================================================================
-- CREATE STRUCTURED DATA TABLE IN SUPABASE
-- ============================================================================
-- Run this SQL once in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS structured_data (
    id SERIAL PRIMARY KEY,
    file_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    row_index INTEGER,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_structured_data_user_id 
ON structured_data(user_id);

CREATE INDEX IF NOT EXISTS idx_structured_data_file_id 
ON structured_data(file_id);

CREATE INDEX IF NOT EXISTS idx_structured_data_created_at 
ON structured_data(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE structured_data ENABLE ROW LEVEL SECURITY;

-- Create policy to ensure users can only access their own data
DROP POLICY IF EXISTS "Users access own data" ON structured_data;

CREATE POLICY "Users access own data" 
ON structured_data
FOR ALL 
USING (user_id = auth.uid()::text);

-- ============================================================================
-- DONE! Your table is ready.
-- ============================================================================
-- Now you can upload JSON files and they'll be stored in this table!

