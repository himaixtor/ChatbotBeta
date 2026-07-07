# Troubleshooting Guide - PostgreSQL Sync Tool

Complete troubleshooting guide for common issues and their solutions.

## Connection Issues

### ❌ "Failed to connect to RemoteDB"

**Error Message**:
```
Error: Failed to connect to RemoteDB: connect ECONNREFUSED x.x.x.x:5432
```

**Causes & Solutions**:

1. **PostgreSQL Not Running**
   ```bash
   # Linux/Ubuntu
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # macOS
   brew services list
   brew services start postgresql@15
   
   # Windows (if installed as service)
   sc query postgresql-x64-15
   ```

2. **Wrong Host/Port in .env**
   ```env
   REMOTE_DB_HOST=your-correct-host.com
   REMOTE_DB_PORT=5432
   ```
   
   Verify with:
   ```bash
   ping your-correct-host.com
   telnet your-correct-host.com 5432
   ```

3. **Firewall Blocking Connection**
   ```bash
   # Test connectivity
   psql -h remote.example.com -U postgres -d chatbot_db
   
   # If fails, check firewall rules on remote server
   # May need to allow port 5432 for your IP
   ```

4. **PostgreSQL Binding to Wrong Interface**
   
   Edit `/etc/postgresql/*/main/postgresql.conf`:
   ```conf
   listen_addresses = '*'  # or specific IP
   ```
   
   Edit `/etc/postgresql/*/main/pg_hba.conf`:
   ```
   host  all  all  0.0.0.0/0  md5
   ```

### ❌ "Connection timeout"

**Error Message**:
```
Error: Failed to connect: connection timeout
```

**Causes & Solutions**:

1. **Network Latency**
   ```bash
   # Check latency to remote
   ping remote.example.com
   
   # If > 5000ms, may timeout
   # Increase timeout in db/connection.js:
   connect_timeout: 10000  # 10 seconds
   ```

2. **Database Server Overloaded**
   ```bash
   # Check database processes on remote
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   
   # May need to wait or scale server
   ```

3. **SSH/VPN Issue**
   ```bash
   # If using SSH tunnel
   ssh -L 5432:localhost:5432 user@remote-host
   # Then use localhost in .env
   ```

### ❌ "getaddrinfo ENOTFOUND"

**Error Message**:
```
Error: getaddrinfo ENOTFOUND remote.example.com
```

**Causes & Solutions**:

1. **DNS Resolution Failed**
   ```bash
   # Check DNS
   nslookup remote.example.com
   
   # Use IP address instead if DNS fails
   REMOTE_DB_HOST=192.168.1.100
   ```

2. **Invalid Hostname**
   ```bash
   # Verify correct hostname
   REMOTE_DB_HOST=prod-db.company.com
   # NOT: REMOTE_DB_HOST=prod-db.company.com:5432 (no port!)
   ```

## Authentication Issues

### ❌ "password authentication failed"

**Error Message**:
```
Error: password authentication failed for user "postgres"
```

**Causes & Solutions**:

1. **Wrong Password**
   ```bash
   # Verify password
   psql -h localhost -U postgres -d chatbot_db
   # If prompted for password, enter to verify
   
   # Update .env with correct password
   LOCAL_DB_PASSWORD=your_correct_password
   ```

2. **Special Characters in Password**
   ```bash
   # If password has special chars like $ @ ! 
   # May need escaping in .env
   
   # DON'T use quotes around password
   LOCAL_DB_PASSWORD=myP@$$w0rd
   
   # If still fails, test with psql first
   psql -h localhost -U postgres -c "SELECT 1"
   ```

3. **Default Password Not Changed**
   ```bash
   # On fresh PostgreSQL install, may use peer authentication
   # Try connecting without password
   psql -h localhost -U postgres
   
   # If works, set password:
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```

4. **Wrong User**
   ```bash
   # Verify PostgreSQL user exists
   psql -h localhost -U postgres -c "\du"
   
   # May need to create sync user:
   CREATE USER sync_user WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE chatbot_db TO sync_user;
   ```

### ❌ "permission denied for schema public"

**Error Message**:
```
Error: permission denied for schema public
```

**Causes & Solutions**:

1. **User Missing Schema Permissions**
   ```sql
   -- Connect as postgres superuser
   psql -U postgres
   
   -- Grant permissions
   GRANT ALL PRIVILEGES ON SCHEMA public TO your_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
   
   -- Make permanent for future objects
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_user;
   ```

2. **User Needs Login Privilege**
   ```sql
   -- Ensure user can login
   ALTER USER your_user WITH LOGIN;
   ```

3. **Database Ownership**
   ```sql
   -- Verify user owns database
   ALTER DATABASE chatbot_db OWNER TO your_user;
   ```

### ❌ "role 'username' does not exist"

**Error Message**:
```
Error: role "postgres" does not exist
```

**Causes & Solutions**:

1. **PostgreSQL Not Initialized**
   ```bash
   # Linux - initialize cluster
   sudo -u postgres /usr/lib/postgresql/*/bin/initdb -D /var/lib/postgresql/*/main
   
   # macOS - using Homebrew
   initdb /usr/local/var/postgres
   ```

2. **User Doesn't Exist**
   ```sql
   -- List existing users
   psql -c "\du"
   
   -- Create user if missing
   CREATE USER postgres SUPERUSER;
   ```

3. **Wrong Connection User**
   ```env
   # Verify .env has correct user
   LOCAL_DB_USER=postgres
   ```

## Configuration Issues

### ❌ "Configuration validation failed"

**Error Message**:
```
LOCAL_DB_HOST is required
REMOTE_DB_PASSWORD is required
```

**Causes & Solutions**:

1. **.env File Not Found**
   ```bash
   # Ensure .env exists
   ls -la .env
   
   # If not, create from template
   cp .env.example .env
   
   # Edit with credentials
   nano .env
   ```

2. **Invalid .env Format**
   ```bash
   # .env must have format: KEY=value
   # NO quotes around values (unless needed)
   
   # Correct:
   LOCAL_DB_HOST=localhost
   LOCAL_DB_PASSWORD=myPassword
   
   # Wrong:
   LOCAL_DB_HOST="localhost"
   LOCAL_DB_PASSWORD='myPassword'
   ```

3. **Environment Variables Not Loaded**
   ```bash
   # Ensure running from correct directory
   cd database
   npm run validate
   
   # Should show all variables
   ```

4. **Missing Variables**
   ```env
   # All of these are REQUIRED:
   LOCAL_DB_HOST=
   LOCAL_DB_PORT=
   LOCAL_DB_NAME=
   LOCAL_DB_USER=
   LOCAL_DB_PASSWORD=
   
   REMOTE_DB_HOST=
   REMOTE_DB_PORT=
   REMOTE_DB_NAME=
   REMOTE_DB_USER=
   REMOTE_DB_PASSWORD=
   ```

## Data Sync Issues

### ❌ "No primary key or unique constraint found"

**Warning Message**:
```
⚠ No primary key or unique constraint found for 'TableName'. Skipping.
```

**Causes & Solutions**:

1. **Table Has No Unique Identifier**
   ```sql
   -- Add primary key to table
   ALTER TABLE TableName ADD PRIMARY KEY (id);
   
   -- Or add unique constraint
   ALTER TABLE TableName ADD UNIQUE (email);
   ```

2. **Only Way to Sync Table**
   ```sql
   -- Must have either:
   -- Option 1: Primary key
   ALTER TABLE users ADD PRIMARY KEY (id);
   
   -- Option 2: Unique constraint
   ALTER TABLE users ADD UNIQUE (email);
   
   -- Without one, sync cannot detect conflicts
   ```

### ❌ "Duplicate key value violates unique constraint"

**Error Message**:
```
duplicate key value violates unique constraint "users_email_key"
```

**Causes & Solutions**:

1. **Row Already Exists**
   ```bash
   # This is expected behavior!
   # Tool logs and skips the row (ON CONFLICT DO NOTHING)
   # Nothing to do - working as intended
   ```

2. **Conflicting Data**
   ```sql
   -- Check what's causing conflict
   SELECT * FROM users WHERE email = 'existing@example.com';
   
   -- Either:
   -- 1. Delete remote row
   DELETE FROM users WHERE email = 'conflicting@example.com';
   
   -- 2. Update remote row
   UPDATE users SET status = 'inactive' WHERE email = 'conflicting@example.com';
   
   -- 3. Run sync again
   npm run sync
   ```

### ❌ "Sync seems stuck or very slow"

**Symptoms**:
- Sync taking longer than expected
- No progress for several minutes
- High CPU/memory usage

**Causes & Solutions**:

1. **Default Batch Size Too Large**
   ```bash
   # Reduce batch size
   BATCH_SIZE=100 npm run sync:data
   
   # Smaller batches = less memory, slower but steady
   ```

2. **Database Server Overloaded**
   ```bash
   # Check server processes
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Solution: Run at off-peak time
   # Or scale database server
   ```

3. **Network Latency**
   ```bash
   # Check ping time
   ping remote.example.com
   
   # If > 1000ms, expect slower sync
   # May need larger BATCH_SIZE
   BATCH_SIZE=1000 npm run sync:data
   ```

4. **Indices Slowing Inserts**
   ```bash
   # Temporarily disable indices (advanced)
   ALTER TABLE big_table DISABLE TRIGGER ALL;
   # Run sync
   npm run sync:data
   ALTER TABLE big_table ENABLE TRIGGER ALL;
   ```

### ❌ "Out of memory during sync"

**Error Message**:
```
JavaScript heap out of memory
# or
FATAL ERROR: CALL_AND_RETRY_LAST
```

**Causes & Solutions**:

1. **Batch Size Too Large**
   ```bash
   # Reduce batch size significantly
   BATCH_SIZE=50 npm run sync:data
   
   # Or even smaller for huge tables
   BATCH_SIZE=10 npm run sync:data
   ```

2. **System Running Out of Memory**
   ```bash
   # Check available memory
   free -h        # Linux
   vm_stat        # macOS
   tasklist       # Windows
   
   # Close other applications
   # Increase swap space if needed
   ```

3. **Large Binary Data**
   ```bash
   # If syncing large BYTEA columns
   # Reduce batch size more
   BATCH_SIZE=5 npm run sync:data
   
   # Or sync data separately from binary columns
   ```

## Schema Sync Issues

### ❌ "Error creating table"

**Error Message**:
```
Error: syntax error in SQL statement
```

**Causes & Solutions**:

1. **Complex Data Types**
   ```sql
   -- Tool may not handle complex types
   -- May need to create table manually
   CREATE TABLE MyTable (
     id SERIAL PRIMARY KEY,
     data JSONB,
     payload BYTEA
   );
   ```

2. **Foreign Keys**
   ```sql
   -- Foreign keys may fail if referenced table missing
   -- Ensure referenced tables exist on remote first
   CREATE TABLE users (id SERIAL PRIMARY KEY);
   -- Then create posts
   CREATE TABLE posts (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id)
   );
   ```

3. **Invalid Identifiers**
   ```sql
   -- Table/column names with special characters
   -- Solution: Quote identifiers properly
   CREATE TABLE "my-table" ("my-column" TEXT);
   ```

### ❌ "Could not add column"

**Error Message**:
```
Error: ALTER TABLE ADD COLUMN failed
```

**Causes & Solutions**:

1. **Column Already Exists**
   ```sql
   -- This is expected, tool logs and continues
   -- No action needed
   ```

2. **Type Mismatch**
   ```sql
   -- If column exists but different type
   -- Tool won't modify existing columns
   -- Must alter manually:
   ALTER TABLE users ALTER COLUMN age TYPE BIGINT;
   ```

3. **Not Null Without Default**
   ```sql
   -- Can't add NOT NULL column to non-empty table without default
   -- Add default value:
   ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active' NOT NULL;
   ```

## Performance Issues

### Sync Very Slow for Large Databases

**Symptoms**:
- Syncing 100M rows takes hours
- CPU maxed out
- Disk constantly active

**Solutions**:

1. **Tune Batch Size**
   ```bash
   # For network latency (high ping)
   BATCH_SIZE=1000 npm run sync:data
   
   # For memory constraints
   BATCH_SIZE=50 npm run sync:data
   
   # For small records, larger batches
   BATCH_SIZE=5000 npm run sync:data
   ```

2. **Run During Off-Peak**
   ```bash
   # 2 AM sync example (cron)
   0 2 * * * cd /path && npm run sync
   ```

3. **Separate Schema and Data**
   ```bash
   # Schema first (usually quick)
   npm run sync:schema
   
   # Data separately (can be slow)
   npm run sync:data
   ```

4. **Add Indices to Speed Inserts**
   ```bash
   # After sync completes
   CREATE INDEX idx_user_email ON users(email);
   CREATE INDEX idx_post_user_id ON posts(user_id);
   ```

5. **Use Larger SSD**
   ```bash
   # Ensure sufficient disk space and speed
   df -h           # Check disk space
   iostat -x 1     # Check disk performance
   ```

### High CPU Usage During Sync

**Causes**:
- Large batch size
- Complex queries
- Database optimization needed

**Solutions**:

1. **Reduce Batch Size**
   ```bash
   BATCH_SIZE=100 npm run sync:data
   ```

2. **Reduce Concurrent Operations**
   ```bash
   # Run only data sync, not both
   npm run sync:data
   ```

3. **Analyze Query Performance**
   ```sql
   -- Check query plans
   EXPLAIN ANALYZE SELECT * FROM large_table;
   
   -- Add indices if needed
   CREATE INDEX idx_table_col ON table(column);
   ```

## Logging & Debugging

### ❌ "How do I see what's happening?"

**Solutions**:

1. **Enable Verbose Output**
   ```bash
   npm run sync:verbose
   # Shows every SQL statement executed
   ```

2. **Check Log File**
   ```bash
   # Today's log
   cat logs/sync-2026-07-07.log
   
   # Last 50 lines
   tail -50 logs/sync-2026-07-07.log
   
   # Watch in real-time
   tail -f logs/sync-*.log
   ```

3. **Search Logs for Errors**
   ```bash
   grep "ERROR" logs/sync-*.log
   grep "WARN" logs/sync-*.log
   ```

### ❌ "Log files not being created"

**Causes & Solutions**:

1. **Missing Logs Directory**
   ```bash
   mkdir -p logs
   # Then retry sync
   npm run sync
   ```

2. **Permission Issues**
   ```bash
   # Check directory permissions
   ls -la logs/
   
   # Fix if needed
   chmod 755 logs/
   chmod 644 logs/*.log
   ```

3. **Wrong Working Directory**
   ```bash
   # Must run from database directory
   cd database
   npm run sync
   
   # NOT from parent directory
   npm run database:sync  # Wrong!
   ```

## Testing & Validation

### ❌ "Validation fails"

**Run full validation**:
```bash
npm run validate

# Shows:
# ✓ Node.js version
# ✓ Dependencies installed
# ✓ File structure
# ✓ Environment variables
# ✓ Database connections
```

**Common Failures**:

1. **Missing Dependencies**
   ```bash
   npm install
   ```

2. **Old Node Version**
   ```bash
   # Upgrade Node.js
   node --version
   # Need 14+
   ```

3. **Database Not Running**
   ```bash
   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

### ❌ "Test sync fails"

**Run test**:
```bash
npm run test

# Tests sync with demo table
# If fails, check error messages
```

**Common Issues**:

1. **No Primary Key on Test Table**
   ```bash
   # Tool should create with primary key
   # If fails, check PostgreSQL version
   psql --version
   ```

2. **Permissions Issue**
   ```sql
   -- Ensure user can create tables
   GRANT CREATE ON DATABASE chatbot_db TO your_user;
   ```

3. **Network Error**
   ```bash
   npm run validate
   # Should show database connection status
   ```

## Windows-Specific Issues

### ❌ Terminal won't recognize npm

**Causes & Solutions**:

1. **Node Not in PATH**
   ```powershell
   # Reinstall Node.js
   # Check "Add to PATH" during installation
   
   # Verify
   node --version
   npm --version
   ```

2. **Running from Wrong Directory**
   ```powershell
   cd D:\Projects\ChatbotBeta\database
   npm run sync
   ```

3. **PowerShell Execution Policy**
   ```powershell
   # If execution policy error
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### ❌ Path Issues on Windows

**Symptoms**:
```
Error: Cannot find module
```

**Solutions**:

1. **Use Forward Slashes**
   ```bash
   # In .env, use either
   LOCAL_DB_HOST=localhost
   
   # NOT Windows-style paths in URLs
   ```

2. **Escape Special Characters**
   ```powershell
   # If password has special chars
   LOCAL_DB_PASSWORD=myP@`$`$w0rd  # PowerShell escaping
   ```

## Common Solutions Checklist

When troubleshooting, try in order:

```
1. ☐ Run validation: npm run validate
2. ☐ Check .env file exists and has correct values
3. ☐ Test database connections manually
4. ☐ Run dry-run first: npm run sync:dry
5. ☐ Check log files: cat logs/sync-*.log
6. ☐ Run with verbose: npm run sync:verbose
7. ☐ Restart PostgreSQL service
8. ☐ Check disk space: df -h
9. ☐ Check available memory
10. ☐ Run test suite: npm run test
```

## Still Having Issues?

1. **Collect Information**:
   ```bash
   npm run validate 2>&1 | tee debug.log
   cat logs/sync-*.log >> debug.log
   cat .env >> debug.log
   psql -c "\du" >> debug.log
   ```

2. **Share Information**:
   - Share `debug.log` (redact passwords)
   - Share terminal output
   - Include PostgreSQL versions

3. **Check Documentation**:
   - [QUICK_START.md](./QUICK_START.md)
   - [SYNC_README.md](./SYNC_README.md)
   - [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

---

**Last Updated**: 2026-07-07  
**Version**: 1.0.0
