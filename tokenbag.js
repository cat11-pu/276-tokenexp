// tokenbag.js：到期判定与增删
export function isExpired(record, now) {
  return record[1] <= now;
}

export function dropToken(table, token) {
  delete table[token];
  return table;
}
