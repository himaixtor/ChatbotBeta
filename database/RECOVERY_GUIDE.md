# Database Sync Recovery Guide

Your sync encountered schema mismatches. Here's how to fix it:

## 🔍 Step 1: Diagnose the Problem

Run the diagnostic tool to identify exactly what's missing:

```bash
npm run diagnose
```

This will show you:
- Which tables exist locally but not remotely
- Which columns are missing in remote tables

## 📋 Issues Found in Your Sync

From your logs, these are the problems:

### Missing Tables on Remote:
- ❌ `TrainChatbot`
- ❌ `TrainChatbotWithUrl`

### Missing Columns on Remote:
- ❌ `ChatBot.did_stream_id`
- ❌ `ChatBot.did_session_id`

### Data Issues:
- ❌ Foreign key violations in `RefreshToken` (User data missing)
- ❌ Some tables have schema mismatches preventing data sync

## ✅ Step 2: Fix Schema First

**The key rule**: Always sync schema BEFORE syncing data.

```bash
# Clear and restart - sync schema only
npm run sync:schema --verbose

# Watch the output to see which tables/columns are created
```

### What This Does:
1. Creates `TrainChatbot` table
2. Creates `TrainChatbotWithUrl` table
3. Adds `did_stream_id` column to `ChatBot`
4. Adds `did_session_id` column to `ChatBot`
5. Creates all missing indices and constraints

## ✅ Step 3: Verify Schema Sync Worked

```bash
npm run diagnose
```

Should now show:
```
✅ Schema is fully synchronized!
   Missing Tables: 0
   Missing Columns: 0
```

## ✅ Step 4: Sync Data

Once schema is correct, sync the data:

```bash
npm run sync:data
```

This will:
1. Insert all missing rows
2. Handle conflicts gracefully
3. Skip duplicates

## ✅ Step 5: Full Sync (Complete Recovery)

Run complete sync to ensure everything is in sync:

```bash
npm run sync
```

Or with verbose output:
```bash
npm run sync:verbose
```

## 🔧 If Schema Sync Still Fails

If tables still aren't being created, here's why and solutions:

### Issue 1: Permission Denied
**Solution**: Ensure remote user has CREATE TABLE permission:

```sql
-- Connect to remote database as postgres/admin
ALTER USER postgres CREATEDB;
GRANT CREATE ON DATABASE chatbot_db TO postgres;
```

### Issue 2: Foreign Key Constraints Preventing Sync
**Solution**: Temporarily disable foreign key checks during initial sync:

```bash
# Option 1: Sync only tables without FK dependencies first
npm run sync:schema

# Option 2: If that fails, manually create tables
# See "Manual Recovery" section below
```

### Issue 3: Data Type Incompatibilities
**Solution**: Check for unsupported data types:

```bash
# Verbose mode shows SQL being executed
npm run sync:schema --verbose

# Look for any SQL errors in output
```

## 🛠️ Manual Recovery (If Automated Sync Fails)

If the automated schema sync isn't working, manually create the missing tables:

### 1. Create TrainChatbot Table

Connect to remote database and run:

```sql
CREATE TABLE "TrainChatbot" (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255),
  file_data BYTEA,
  ai_response_id VARCHAR(255),
  trained_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Create TrainChatbotWithUrl Table

```sql
CREATE TABLE "TrainChatbotWithUrl" (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(255),
  url VARCHAR(255),
  ai_response_id VARCHAR(255),
  trained_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Add Missing Columns to ChatBot

```sql
ALTER TABLE "ChatBot" ADD COLUMN did_stream_id TEXT;
ALTER TABLE "ChatBot" ADD COLUMN did_session_id TEXT;
```

### 4. Verify Tables Exist

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check ChatBot columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ChatBot'
ORDER BY ordinal_position;
```

## 📝 Summary of Recovery Process

```
1. npm run diagnose        # Identify problems
   ↓
2. npm run sync:schema     # Create missing objects
   ↓
3. npm run diagnose        # Verify schema matches
   ↓
4. npm run sync:data       # Sync data
   ↓
5. npm run sync --verbose  # Full verification sync
```

## ⚠️ Important Notes

### Order Matters!
- **Always** sync schema before data
- Schema mismatches prevent data insertion
- Foreign key tables must exist before dependent tables

### The Tool Is Non-Destructive
- Won't delete anything from remote
- Won't overwrite existing data
- Safe to run repeatedly

### If Data Still Won't Sync
```bash
# Check which tables are failing
npm run sync:data --verbose

# Look for:
# - Missing foreign key references
# - Missing unique identifiers (primary key)
# - Type mismatches
```

## 🆘 Still Having Issues?

If the recovery guide doesn't solve it:

1. **Check logs**: `cat logs/sync-*.log | tail -100`
2. **Verify remote manually**:
   ```bash
   psql -h 172.16.1.67 -U postgres -d chatbot_db
   \dt   # List tables
   \d "TableName"  # Show table structure
   ```
3. **Check remote user permissions**:
   ```sql
   -- As postgres superuser on remote
   SELECT * FROM information_schema.role_table_grants
   WHERE grantee = 'postgres';
   ```

## 🚀 Next Time

For future syncs, always use this pattern:

```bash
# Always the same order:
npm run sync:schema    # First
npm run sync:data      # Then
npm run sync           # Finally (verify all)
```

---

**Pro Tip**: Use the diagnostic tool regularly:

```bash
# Before every large sync
npm run diagnose

# After schema changes
npm run diagnose
```

This ensures you catch schema mismatches early!
