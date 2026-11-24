import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import localWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { SEED_SQL } from '../data/seed';
import type { QueryResult } from '../types/sql';

// Version-matched CDN binary for sql.js@1.17.0 (falls back to local Vite-bundled WASM if offline)
export const SQL_WASM_CDN_URL =
  'https://cdn.jsdelivr.net/npm/sql.js@1.17.0/dist/sql-wasm-browser.wasm';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

async function fetchWasmBinary(): Promise<ArrayBuffer> {
  const candidates = [localWasmUrl, SQL_WASM_CDN_URL];
  let lastError: unknown = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
      }
      const buf = await res.arrayBuffer();
      // Verify WASM magic bytes (\0asm) so an HTML 404 fallback page is never accepted
      const magic = new Uint8Array(buf, 0, 4);
      if (magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d) {
        return buf;
      }
      throw new Error(`Invalid WASM header from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to fetch SQLite WASM binary from local bundle or CDN.');
}

function resolveInitSqlJs(): typeof initSqlJs {
  if (typeof initSqlJs === 'function') {
    return initSqlJs;
  }
  const maybeDefault = (initSqlJs as unknown as { default?: typeof initSqlJs })?.default;
  if (typeof maybeDefault === 'function') {
    return maybeDefault;
  }
  throw new Error('sql.js initializer could not be resolved.');
}

/**
 * Initializes sql.js WASM runtime once using a verified binary.
 */
export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const wasmBinary = await fetchWasmBinary();
      const init = resolveInitSqlJs();
      return await init({
        wasmBinary,
        locateFile: () => SQL_WASM_CDN_URL,
        useOldExtensionFunctions: false,
      });
    })().catch((err) => {
      sqlJsPromise = null;
      throw err;
    });
  }
  return sqlJsPromise;
}

export async function createSeededDatabase(): Promise<Database> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  db.run(SEED_SQL);
  return db;
}

export function runSqlQuery(db: Database, sql: string): QueryResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw new Error('Query is empty. Enter a valid SQLite statement to execute.');
  }

  const start = performance.now();
  const results = db.exec(trimmed);
  const elapsed = Math.max(0.01, performance.now() - start);

  if (results.length === 0) {
    const modified = db.getRowsModified();
    return {
      columns: [],
      values: [],
      executionTimeMs: Number(elapsed.toFixed(2)),
      rowCount: 0,
      statementType: 'mutation',
      rowsModified: modified,
    };
  }

  const lastResult = results[results.length - 1];
  return {
    columns: lastResult.columns,
    values: lastResult.values,
    executionTimeMs: Number(elapsed.toFixed(2)),
    rowCount: lastResult.values.length,
    statementType: 'query',
  };
}

export function getTableRowCounts(db: Database, tableNames: string[]): Record<string, number | null> {
  const counts: Record<string, number | null> = {};
  for (const table of tableNames) {
    try {
      const res = db.exec(`SELECT COUNT(*) FROM "${table}";`);
      counts[table] = res.length > 0 ? Number(res[0].values[0][0]) : 0;
    } catch {
      counts[table] = null;
    }
  }
  return counts;
}
