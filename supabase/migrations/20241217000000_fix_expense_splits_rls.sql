-- Add settled_by column to track who marked the split as settled
ALTER TABLE expense_splits
ADD COLUMN IF NOT EXISTS settled_by uuid REFERENCES profiles(id);

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update expense splits they paid for" ON expense_splits;
DROP POLICY IF EXISTS "Users can update their own expense splits" ON expense_splits;
DROP POLICY IF EXISTS "Expense payer can update splits" ON expense_splits;

-- Create new update policy that allows:
-- 1. The expense payer to update any split on their expense
-- 2. The split owner to update their own split (e.g., mark as settled)
CREATE POLICY "Users can update expense splits"
ON expense_splits
FOR UPDATE
USING (
  -- User is the split owner (can update their own split)
  user_id = auth.uid()
  OR
  -- User paid for the expense (can update any split on their expense)
  expense_id IN (
    SELECT id FROM expenses WHERE paid_by = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  expense_id IN (
    SELECT id FROM expenses WHERE paid_by = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
