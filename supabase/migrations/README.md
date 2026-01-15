# Database Migration Guide

## Applying the Migration

### Option 1: Supabase Dashboard (Recommended for MVP)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `schema.sql`
4. Paste and run the SQL
5. Verify tables appear in **Table Editor**

### Option 2: Supabase CLI (If installed)
```bash
supabase db push
```

## Manual Test Cases

### Test 1: Verify Tables Created
**Action:** Check Supabase Table Editor
**Expected:** See `conversations`, `messages`, and `crisis_flags` tables

### Test 2: Verify RLS Enabled
**Action:** Run in SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'crisis_flags');
```
**Expected:** All three tables show `rowsecurity = true`

### Test 3: Verify Policies Exist
**Action:** Run in SQL Editor:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected:** See policies for each table (conversations: 4, messages: 2, crisis_flags: 2)

### Test 4: Test Unique Constraint
**Action:** Create a test user, then try to insert two conversations for the same date
**SQL:**
```sql
-- This should succeed
INSERT INTO conversations (user_id, date) 
VALUES (auth.uid(), CURRENT_DATE);

-- This should fail with unique constraint violation
INSERT INTO conversations (user_id, date) 
VALUES (auth.uid(), CURRENT_DATE);
```
**Expected:** First insert succeeds, second fails with unique constraint error

### Test 5: Test CASCADE Delete
**Action:** Create a conversation with messages, then delete the conversation
**SQL:**
```sql
-- Create conversation
INSERT INTO conversations (user_id, date) 
VALUES (auth.uid(), CURRENT_DATE) RETURNING id;

-- Insert messages (use the id from above)
INSERT INTO messages (conversation_id, role, content)
VALUES 
  ('<conversation_id>', 'user', 'Test message 1'),
  ('<conversation_id>', 'assistant', 'Test response 1');

-- Delete conversation
DELETE FROM conversations WHERE id = '<conversation_id>';

-- Verify messages are deleted
SELECT COUNT(*) FROM messages WHERE conversation_id = '<conversation_id>';
```
**Expected:** Message count returns 0 (messages deleted via CASCADE)

### Test 6: Test RLS Isolation
**Action:** Create two test users, verify they can't see each other's data
**Note:** Requires two authenticated sessions or manual user switching
**Expected:** Each user only sees their own conversations/messages

## Common Issues & Debugging

### Issue 1: "relation does not exist"
**Cause:** Migration not applied
**Fix:** Run the migration SQL in Supabase Dashboard SQL Editor

### Issue 2: "permission denied for table"
**Cause:** RLS blocking access, or user not authenticated
**Fix:** 
- Verify user is authenticated: `SELECT auth.uid();` should return UUID
- Check RLS policies are created: Run Test 3 above
- Verify policies use `auth.uid()` correctly

### Issue 3: "duplicate key value violates unique constraint"
**Cause:** Trying to create two conversations for same user/date
**Expected Behavior:** This is correct - constraint working as designed
**Fix:** Check if conversation exists first, or use `ON CONFLICT` in application code

### Issue 4: "foreign key constraint fails"
**Cause:** Referencing non-existent conversation_id or user_id
**Fix:** 
- Verify conversation exists before inserting message
- Verify user exists in auth.users (Supabase Auth handles this)

### Issue 5: "function update_updated_at_column() does not exist"
**Cause:** Trigger function not created
**Fix:** Re-run the migration, or manually create the function from the migration file

## Verification Checklist

- [ ] All three tables exist
- [ ] RLS is enabled on all tables
- [ ] All policies are created (8 total: 4 conversations, 2 messages, 2 crisis_flags)
- [ ] Unique constraint works (user_id, date)
- [ ] CASCADE delete works (delete conversation → messages deleted)
- [ ] Trigger updates `updated_at` on conversation update
- [ ] Indexes exist (check with `\d+ conversations` in psql or Table Editor)

## Next Steps

After migration is verified:
1. Proceed to Step 5.2: Authentication Flow
2. Test RLS with actual authenticated users
3. Verify hard delete works when user account is deleted (test in Supabase Auth)

