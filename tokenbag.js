// tokenbag.js：到期判定与增删
export function isExpired(record, now) {
  if (!record) return false;
  const expiresAt = Array.isArray(record) ? record[1] : record.expires_at;
  return typeof expiresAt === "number" && expiresAt <= now;
}

export function dropToken(table, token) {
  const next = Object.assign({}, table);
  delete next[token];
  return next;
}
