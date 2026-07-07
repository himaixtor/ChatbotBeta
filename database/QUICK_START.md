# Quick Start Guide - PostgreSQL DB Sync Tool

Get up and running in 5 minutes!

## 1️⃣ Setup (2 minutes)

### Copy and configure `.env`

```bash
cd database
copy .env.example .env
```

### Edit `.env` with your database credentials

```env
# Local Database (your development database)
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_NAME=chatbot_db
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=Hiindia@1234

# Remote Database (your production/target database)
REMOTE_DB_HOST=your-remote-host.com
REMOTE_DB_PORT=5432
REMOTE_DB_NAME=chatbot_db
REMOTE_DB_USER=postgres
REMOTE_DB_PASSWORD=your-remote-password
```

## 2️⃣ Verify Configuration (1 minute)

```bash
# Test local database connection
psql -h localhost -U postgres -d chatbot_db -c "SELECT version();"

# Test remote database connection  
psql -h 172.16.1.67 -U postgres -d chatbot_db -c "SELECT version();"
```

If both commands return PostgreSQL version, you're good to go!

## 3️⃣ Run First Sync (2 minutes)

### Preview what will happen (DRY RUN)

```bash
npm run sync:dry
```

Review the output to make sure it looks correct.

### Execute the actual sync

```bash
npm run sync
```

Watch the progress in your terminal!

## ✅ Success Indicators

You should see output like:

```
🔄 PostgreSQL Database Synchronization Tool
═══════════════════════════════════════════════
Connecting to databases...
✔ Connected successfully

📋 Schema Synchronization
───────────────────────
✔ Users created
✔ Chats created

Schema Sync Summary:
  Tables Created:     12
  Columns Added:      0
  Indices Created:    15

📊 Data Synchronization
──────────────────────
✔ Users: 150 inserted, 25 skipped
✔ Chats: 800 inserted, 1200 skipped
✔ Messages: 5000 inserted, 10000 skipped

✅ Synchronization completed successfully!
```

## 📋 Common Commands

| Task | Command |
|------|---------|
| Full sync (schema + data) | `npm run sync` |
| Schema only | `npm run sync:schema` |
| Data only | `npm run sync:data` |
| Preview changes | `npm run sync:dry` |
| Debug output | `npm run sync:verbose` |
| Help | `node sync.js --help` |

## 🔄 Incremental Syncs

The tool is safe to run multiple times:

```bash
# Run sync anytime to add new schema or data
npm run sync

# No risk - existing data is never overwritten
# Missing schema objects are created
# Duplicate rows are skipped automatically
```

## 🆘 Troubleshooting

### Can't connect to remote database?

```bash
# Check if PostgreSQL is running on remote
ping your-remote-host.com

# Verify credentials in .env are correct
cat .env
```

### Sync seems stuck?

Press `Ctrl+C` to stop, then check logs:

```bash
cat logs/sync-*.log | tail -100
```

### Want to see SQL statements?

```bash
npm run sync:verbose
```

This shows every SQL command executed.

## 📊 Check Sync Results

After sync completes:

```bash
# View detailed log file
type logs\sync-2026-07-07.log    # Windows
cat logs/sync-2026-07-07.log     # Linux/Mac

# Query synced data on remote
psql -h your-remote-host.com -U postgres -d chatbot_db
postgres=# SELECT COUNT(*) FROM "Users";
postgres=# SELECT COUNT(*) FROM "Chats";
```

## ⚡ Performance Tips

**For large databases (>1M rows):**

```bash
# Use larger batches
BATCH_SIZE=1000 npm run sync:data

# Or smaller batches if memory is limited
BATCH_SIZE=100 npm run sync:data
```

**Run schema and data separately for very large databases:**

```bash
npm run sync:schema    # First
npm run sync:data      # Then
```

## 🔐 Security

✅ **Safe practices in this tool:**
- Credentials only from `.env` file
- Parameterized queries (no SQL injection)
- No data deletion
- No data overwriting
- Transactions per table
- Role-based access control friendly

❌ **Don't do:**
- Don't commit `.env` to git
- Don't share `.env` file
- Don't use production password for local dev

## 📚 Learn More

For detailed documentation, see: [SYNC_README.md](./SYNC_README.md)

Topics:
- Architecture and how it works
- Advanced configuration
- Performance optimization
- Troubleshooting guide
- Project structure
- Security considerations

## 🎯 Next Steps

1. ✅ Setup `.env` file with credentials
2. ✅ Verify database connections
3. ✅ Run `npm run sync:dry` to preview
4. ✅ Run `npm run sync` to execute
5. ✅ Check `logs/sync-*.log` for results
6. ✅ Schedule regular syncs if needed

## 📞 Support

**Getting errors?**

1. Check the log file: `logs/sync-*.log`
2. Run with verbose output: `npm run sync:verbose`
3. Try dry-run first: `npm run sync:dry`
4. Review detailed docs: [SYNC_README.md](./SYNC_README.md)

**Need to schedule regular syncs?**

Add a cron job:

```bash
# Linux/Mac: Edit crontab
crontab -e

# Add line to sync daily at 2 AM
0 2 * * * cd /path/to/database && npm run sync >> logs/sync-cron.log 2>&1
```

On Windows, use Task Scheduler to run:
```
cmd /c "cd D:\Projects\ChatbotBeta\database && npm run sync"
```

---

**Ready? Start with Step 1 above!** 🚀
