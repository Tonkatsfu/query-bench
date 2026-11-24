import initSqlJs from 'sql.js';
import { SCHEMA_METADATA, SEED_SQL, SEED_STATS } from '../src/data/seed';
import { PROBLEMS } from '../src/data/problems';
import { REFRESHER_TOPICS } from '../src/data/sqlRefresher';
import { gradeSubmission } from '../src/utils/grader';
import type { QueryResult } from '../src/types/sql';

function execQuery(db: initSqlJs.Database, sql: string): QueryResult {
  const start = performance.now();
  const res = db.exec(sql);
  const elapsed = Number((performance.now() - start).toFixed(2));
  if (res.length === 0) {
    return {
      columns: [],
      values: [],
      executionTimeMs: elapsed,
      rowCount: 0,
      statementType: 'mutation',
      rowsModified: db.getRowsModified(),
    };
  }
  const last = res[res.length - 1];
  return {
    columns: last.columns,
    values: last.values,
    executionTimeMs: elapsed,
    rowCount: last.values.length,
    statementType: 'query',
  };
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(SEED_SQL);

  console.log('Seed Stats:', SEED_STATS);
  if (SCHEMA_METADATA.length < 8) {
    throw new Error(`Expected >= 8 tables, got ${SCHEMA_METADATA.length}`);
  }
  for (const tbl of SCHEMA_METADATA) {
    const cnt = db.exec(`SELECT COUNT(*) FROM "${tbl.name}";`)[0].values[0][0];
    console.log(`  Table ${tbl.name}: ${cnt} rows`);
  }

  console.log(`Total problems loaded: ${PROBLEMS.length}`);
  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  const ids = new Set<string>();
  const titles = new Set<string>();
  const sqls = new Set<string>();
  const zeroRowProblems: string[] = [];

  for (const problem of PROBLEMS) {
    counts[problem.difficulty]++;
    if (ids.has(problem.id)) {
      throw new Error(`Duplicate problem ID: ${problem.id}`);
    }
    ids.add(problem.id);

    if (titles.has(problem.title)) {
      throw new Error(`Duplicate problem title: ${problem.title}`);
    }
    titles.add(problem.title);

    const normSql = problem.solutionSql.replace(/\s+/g, ' ').trim();
    if (sqls.has(normSql)) {
      throw new Error(`Duplicate solution SQL on Q${problem.number} (${problem.id})`);
    }
    sqls.add(normSql);

    const queryResult = execQuery(db, problem.solutionSql);
    if (queryResult.rowCount === 0) {
      zeroRowProblems.push(`Q${problem.number} (${problem.id})`);
      continue;
    }
    if (queryResult.columns.length !== problem.expectedColumns.length) {
      throw new Error(`Problem #${problem.number} (${problem.id}) column count mismatch`);
    }
    for (let i = 0; i < queryResult.columns.length; i++) {
      if (queryResult.columns[i] !== problem.expectedColumns[i].name) {
        throw new Error(
          `Problem #${problem.number} (${problem.id}) col[${i}] name mismatch: expected '${problem.expectedColumns[i].name}', got '${queryResult.columns[i]}'`
        );
      }
    }
    const grade = gradeSubmission(problem, queryResult, queryResult, problem.solutionSql);
    if (!grade.passed) {
      throw new Error(`Self-grade failed for Q${problem.number}: ${grade.summary}`);
    }
  }

  console.log('Difficulty distribution:', counts);
  if (zeroRowProblems.length > 0) {
    console.error(`Zero-row problems (${zeroRowProblems.length}):`, zeroRowProblems);
    throw new Error(`${zeroRowProblems.length} problems returned 0 rows`);
  }

  if (PROBLEMS.length !== 120) {
    throw new Error(`Expected 120 unique problems, got ${PROBLEMS.length}`);
  }
  console.log(`✓ All ${PROBLEMS.length} unique problems verified: unique IDs, titles, SQL, >0 rows, column metadata match, self-grade PASS`);

  // Verify all interactive SQL Refresher examples execute cleanly
  for (const topic of REFRESHER_TOPICS) {
    for (const ex of topic.examples) {
      const exRes = execQuery(db, ex.sql);
      if (exRes.rowCount === 0) {
        throw new Error(`Refresher topic '${topic.id}' example '${ex.title}' returned 0 rows`);
      }
    }
  }
  console.log(`✓ All ${REFRESHER_TOPICS.length} SQL Refresher topic examples verified`);

  // Grader Edge Cases
  const q12 = PROBLEMS[11];
  const q12Expected = execQuery(db, q12.solutionSql);
  const q12WrongSql = q12.solutionSql.replace('DENSE_RANK()', 'ROW_NUMBER()');
  const q12WrongRes = execQuery(db, q12WrongSql);
  const q12Grade = gradeSubmission(q12, q12WrongRes, q12Expected, q12WrongSql);
  if (q12Grade.passed || !q12Grade.details.some((d) => d.includes('DENSE_RANK'))) {
    throw new Error(`Expected Q12 ROW_NUMBER failure hint`);
  }
  console.log('✓ Grader caught Q12 ROW_NUMBER vs DENSE_RANK tie bug');

  // DDL mutation + Database Reset recovery
  db.run('DROP TABLE support_tickets;');
  db.run('DROP TABLE order_items;');
  db.run(SEED_SQL);
  const restoredCount = db.exec('SELECT COUNT(*) FROM order_items;')[0].values[0][0];
  if (restoredCount !== SEED_STATS.orderItems) {
    throw new Error(`Expected ${SEED_STATS.orderItems} rows after reset, got ${restoredCount}`);
  }
  console.log(`✓ Database reset restored all 9 tables cleanly`);

  console.log('\nAll 9 tables, 120 unique problems, refresher examples, grader, and reset verifications PASSED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
