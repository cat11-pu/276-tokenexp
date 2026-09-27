// tokenbag.js：到期判定与增删（基线：一律说还没到期）
export function isExpired(record, now) {
  return false;
}

export function dropToken(table, token) {
  return table;
}
