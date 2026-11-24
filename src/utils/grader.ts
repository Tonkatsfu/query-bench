import type { CellMismatch, GradeResult, Problem, QueryResult } from '../types/sql';

const FLOAT_TOLERANCE = 0.015;

type CellValue = string | number | null | Uint8Array;

function isNumericLike(val: CellValue): boolean {
  if (typeof val === 'number') return !Number.isNaN(val);
  if (typeof val === 'string' && val.trim() !== '') {
    return !Number.isNaN(Number(val));
  }
  return false;
}

function cellsEqual(a: CellValue, b: CellValue): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  if (isNumericLike(a) && isNumericLike(b)) {
    const numA = Number(a);
    const numB = Number(b);
    return Math.abs(numA - numB) <= FLOAT_TOLERANCE;
  }

  return String(a).trim() === String(b).trim();
}

function normalizeRowSignature(row: CellValue[]): string {
  return row
    .map((cell) => {
      if (cell === null) return '__NULL__';
      if (isNumericLike(cell)) return `N:${Number(cell).toFixed(2)}`;
      return `S:${String(cell).trim()}`;
    })
    .join('||');
}

function rowsMatchUnordered(a: CellValue[][], b: CellValue[][]): boolean {
  if (a.length !== b.length) return false;
  const sigA = a.map(normalizeRowSignature).sort();
  const sigB = b.map(normalizeRowSignature).sort();
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] !== sigB[i]) return false;
  }
  return true;
}

export function formatCellValue(val: CellValue): string {
  if (val === null) return 'NULL';
  if (val instanceof Uint8Array) return `[BLOB ${val.byteLength}B]`;
  return String(val);
}

export function gradeSubmission(
  problem: Problem,
  userResult: QueryResult,
  expectedResult: QueryResult,
  userSql: string
): GradeResult {
  const details: string[] = [];
  const tips: string[] = [];
  const mismatches: CellMismatch[] = [];

  const expectedColCount = expectedResult.columns.length;
  const actualColCount = userResult.columns.length;
  const expectedRowCount = expectedResult.rowCount;
  const actualRowCount = userResult.rowCount;

  // Run problem-specific diagnostic checks
  const collectCustomHints = () => {
    if (!problem.commonMistakeHints) return;
    for (const rule of problem.commonMistakeHints) {
      const hint = rule.check(userResult, expectedResult, userSql);
      if (hint && !details.includes(hint)) {
        details.push(hint);
      }
    }
  };

  // 1. Check if statement returned a result set at all
  if (userResult.statementType === 'mutation' || actualColCount === 0) {
    return {
      passed: false,
      summary: 'No result set returned — expected a SELECT query.',
      details: [
        'Your SQL statement executed without returning rows. Make sure your final statement is a `SELECT` query.',
      ],
      tips: [],
      expectedRowCount,
      actualRowCount,
      expectedColCount,
      actualColCount,
      mismatches: [],
      executionTimeMs: userResult.executionTimeMs,
    };
  }

  // 2. Column count check
  if (actualColCount !== expectedColCount) {
    details.push(
      `Column count mismatch: expected ${expectedColCount} columns (${expectedResult.columns.join(', ')}), but got ${actualColCount} (${userResult.columns.join(', ')}).`
    );
    collectCustomHints();
    return {
      passed: false,
      summary: `Column count mismatch: expected ${expectedColCount}, got ${actualColCount}.`,
      details,
      tips,
      expectedRowCount,
      actualRowCount,
      expectedColCount,
      actualColCount,
      mismatches: [],
      executionTimeMs: userResult.executionTimeMs,
    };
  }

  // Track column name differences as helpful tips (or warning)
  const mismatchedAliases: string[] = [];
  for (let c = 0; c < expectedColCount; c++) {
    if (userResult.columns[c].toLowerCase() !== expectedResult.columns[c].toLowerCase()) {
      mismatchedAliases.push(
        `column #${c + 1}: expected '${expectedResult.columns[c]}', got '${userResult.columns[c]}'`
      );
    }
  }

  // 3. Row count check
  if (actualRowCount !== expectedRowCount) {
    details.push(
      `Row count mismatch: expected ${expectedRowCount} row${expectedRowCount === 1 ? '' : 's'}, got ${actualRowCount}.`
    );
    collectCustomHints();
    if (mismatchedAliases.length > 0) {
      tips.push(`Column alias note: ${mismatchedAliases.join('; ')}.`);
    }
    return {
      passed: false,
      summary: `Row count mismatch: expected ${expectedRowCount}, got ${actualRowCount}.`,
      details,
      tips,
      expectedRowCount,
      actualRowCount,
      expectedColCount,
      actualColCount,
      mismatches: [],
      executionTimeMs: userResult.executionTimeMs,
    };
  }

  // 4. Value-by-value comparison
  for (let r = 0; r < expectedRowCount; r++) {
    for (let c = 0; c < expectedColCount; c++) {
      const expVal = expectedResult.values[r][c];
      const actVal = userResult.values[r][c];
      if (!cellsEqual(expVal, actVal)) {
        if (mismatches.length < 8) {
          mismatches.push({
            rowIndex: r,
            colIndex: c,
            columnName: expectedResult.columns[c],
            expected: expVal,
            actual: actVal,
          });
        }
      }
    }
  }

  if (mismatches.length > 0) {
    // Check if rows match when order is ignored
    const sameRowsWrongOrder = rowsMatchUnordered(userResult.values, expectedResult.values);
    if (sameRowsWrongOrder && problem.orderMatters !== false) {
      details.push(
        'All row values match, but the sort order is different from the expected output. Check your `ORDER BY` clause (including tie-breaker columns).'
      );
      return {
        passed: false,
        summary: 'Incorrect row ordering — values match, but sort order differs.',
        details,
        tips,
        expectedRowCount,
        actualRowCount,
        expectedColCount,
        actualColCount,
        mismatches: mismatches.slice(0, 5),
        executionTimeMs: userResult.executionTimeMs,
      };
    }

    const first = mismatches[0];
    details.push(
      `Value mismatch at Row ${first.rowIndex + 1}, column '${first.columnName}': expected ${formatCellValue(first.expected)}, got ${formatCellValue(first.actual)}.`
    );
    collectCustomHints();

    return {
      passed: false,
      summary: `Value mismatch across ${mismatches.length >= 8 ? '8+' : mismatches.length} cell${mismatches.length === 1 ? '' : 's'}.`,
      details,
      tips,
      expectedRowCount,
      actualRowCount,
      expectedColCount,
      actualColCount,
      mismatches,
      executionTimeMs: userResult.executionTimeMs,
    };
  }

  // All rows, columns, and values match!
  if (mismatchedAliases.length > 0) {
    tips.push(
      `Interview tip: Your values match 100%, though column aliases differ slightly (${mismatchedAliases.join('; ')}). Matching stakeholder-requested column names is a great habit.`
    );
  }

  return {
    passed: true,
    summary: `All ${expectedRowCount} rows and ${expectedColCount} columns match the expected output.`,
    details: [
      `Verified ${expectedRowCount} rows × ${expectedColCount} columns in ${userResult.executionTimeMs} ms.`,
    ],
    tips,
    expectedRowCount,
    actualRowCount,
    expectedColCount,
    actualColCount,
    mismatches: [],
    executionTimeMs: userResult.executionTimeMs,
  };
}
