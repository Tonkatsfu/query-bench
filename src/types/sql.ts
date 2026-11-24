export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface QueryResult {
  columns: string[];
  values: (string | number | null | Uint8Array)[][];
  executionTimeMs: number;
  rowCount: number;
  statementType?: 'query' | 'mutation';
  rowsModified?: number;
}

export interface ExpectedColumn {
  name: string;
  type: string;
  description: string;
}

export interface Problem {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  concepts: string[];
  stakeholder: string;
  scenario: string;
  requirements: string[];
  expectedColumns: ExpectedColumn[];
  starterSql: string;
  hints: [string, string];
  solutionSql: string;
  explanation: string;
  orderMatters?: boolean;
  commonMistakeHints?: {
    check: (
      userResult: QueryResult,
      expectedResult: QueryResult,
      userSql: string
    ) => string | null;
  }[];
}

export interface CellMismatch {
  rowIndex: number;
  colIndex: number;
  columnName: string;
  expected: string | number | null | Uint8Array;
  actual: string | number | null | Uint8Array;
}

export interface GradeResult {
  passed: boolean;
  summary: string;
  details: string[];
  tips: string[];
  expectedRowCount: number;
  actualRowCount: number;
  expectedColCount: number;
  actualColCount: number;
  mismatches: CellMismatch[];
  executionTimeMs: number;
}

export interface TableColumnSchema {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  nullable?: boolean;
  note?: string;
}

export interface TableSchemaInfo {
  name: string;
  description: string;
  columns: TableColumnSchema[];
}
