function safeIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Invalid identifier');
  }

  if (!/^[a-zA-Z0-9_".-]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }

  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }

  return `"${identifier}"`;
}

function escapeSqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  return 'NULL';
}

function getConflictColumns(row, primaryKeys) {
  if (!row || typeof row !== 'object') {
    return [];
  }

  const rowKeys = Object.keys(row);

  for (const pk of primaryKeys) {
    if (rowKeys.includes(pk)) {
      return [pk];
    }
  }

  const uniqueKey = rowKeys[0];
  if (uniqueKey && row[uniqueKey] !== null && row[uniqueKey] !== undefined) {
    return [uniqueKey];
  }

  return [];
}

function buildInsertQuery(tableName, columns, values) {
  const safeTable = safeIdentifier(tableName);
  const safeColumns = columns.map(col => safeIdentifier(col)).join(', ');
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  return `INSERT INTO ${safeTable} (${safeColumns}) VALUES (${placeholders})`;
}

function buildUpsertQuery(tableName, columns, conflictColumns, values) {
  let query = buildInsertQuery(tableName, columns, values);

  const safeConflictCols = conflictColumns.map(col => safeIdentifier(col)).join(', ');
  query += ` ON CONFLICT (${safeConflictCols}) DO NOTHING`;

  return query;
}

module.exports = {
  safeIdentifier,
  escapeSqlString,
  getConflictColumns,
  buildInsertQuery,
  buildUpsertQuery,
};
