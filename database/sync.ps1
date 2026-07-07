(Get-Content schema.sql) |
ForEach-Object {
    if ($_ -match '^INSERT INTO') {
        $_ -replace ';$', ' ON CONFLICT DO NOTHING;'
    }
    else {
        $_
    }
} | Set-Content backup_sync.sql