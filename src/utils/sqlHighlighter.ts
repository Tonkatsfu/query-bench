export type SqlTokenType =
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'function'
  | 'operator'
  | 'plain';

export interface SqlToken {
  type: SqlTokenType;
  value: string;
}

const SQL_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS',
  'NULL',
  'AS',
  'ON',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'OUTER',
  'CROSS',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'DISTINCT',
  'WITH',
  'RECURSIVE',
  'UNION',
  'ALL',
  'EXCEPT',
  'INTERSECT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'OVER',
  'PARTITION',
  'ROWS',
  'RANGE',
  'PRECEDING',
  'FOLLOWING',
  'CURRENT',
  'ROW',
  'UNBOUNDED',
  'CAST',
  'INTEGER',
  'REAL',
  'TEXT',
  'NUMERIC',
  'EXISTS',
  'CREATE',
  'TABLE',
  'DROP',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'ALTER',
  'PRAGMA',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'ROUND',
  'COALESCE',
  'IFNULL',
  'NULLIF',
  'STRFTIME',
  'DATE',
  'DATETIME',
  'JULIANDAY',
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
  'LAG',
  'LEAD',
  'FIRST_VALUE',
  'LAST_VALUE',
  'NTILE',
  'LOWER',
  'UPPER',
  'SUBSTR',
  'SUBSTRING',
  'LENGTH',
  'TRIM',
  'REPLACE',
  'ABS',
  'PRINTF',
]);

// Combined master regex for fast single-pass SQL tokenization
const TOKEN_REGEX =
  /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|[^'])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|([=<>!+\-*/%,();.]+)/g;

export function tokenizeSql(code: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(TOKEN_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      tokens.push({ type: 'plain', value: code.slice(lastIndex, idx) });
    }

    const [full, comment, str, num, word, op] = match;
    if (comment) {
      tokens.push({ type: 'comment', value: full });
    } else if (str) {
      tokens.push({ type: 'string', value: full });
    } else if (num) {
      tokens.push({ type: 'number', value: full });
    } else if (word) {
      const upper = word.toUpperCase();
      if (SQL_FUNCTIONS.has(upper)) {
        tokens.push({ type: 'function', value: full });
      } else if (SQL_KEYWORDS.has(upper)) {
        tokens.push({ type: 'keyword', value: full });
      } else {
        tokens.push({ type: 'plain', value: full });
      }
    } else if (op) {
      tokens.push({ type: 'operator', value: full });
    }

    lastIndex = idx + full.length;
  }

  if (lastIndex < code.length) {
    tokens.push({ type: 'plain', value: code.slice(lastIndex) });
  }

  return tokens;
}

export const TOKEN_CLASSES: Record<SqlTokenType, string> = {
  comment: 'text-[#5b606e] italic',
  string: 'text-[#73c991]',
  number: 'text-[#d19a66]',
  keyword: 'text-[#e2a03f] font-medium',
  function: 'text-[#7aa2f7]',
  operator: 'text-[#848894]',
  plain: 'text-[#e4e4e7]',
};
