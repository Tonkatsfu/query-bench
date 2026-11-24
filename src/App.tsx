import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PROBLEMS } from './data/problems';
import { SCHEMA_METADATA } from './data/seed';
import {
  createSeededDatabase,
  getTableRowCounts,
  runSqlQuery,
} from './services/sqlEngine';
import type { GradeResult, QueryResult } from './types/sql';
import { gradeSubmission } from './utils/grader';
import { Header } from './components/Header';
import { LeftPanel, type LeftTab } from './components/LeftPanel';
import { OutputConsole, type ConsoleTab } from './components/OutputConsole';
import { ProblemDrawer } from './components/ProblemDrawer';
import { SqlEditor } from './components/SqlEditor';

const STORAGE_SOLVED_KEY = 'querybench_solved_v1';
const STORAGE_DRAFTS_KEY = 'querybench_drafts_v1';

const TABLE_NAMES = SCHEMA_METADATA.map((t) => t.name);

function loadSolvedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_SOLVED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function loadDraftsFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function isMutatingSql(sql: string): boolean {
  const stripped = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  return /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE)\b/i.test(stripped);
}

export function App() {
  const dbRef = useRef<Database | null>(null);
  const refDbRef = useRef<Database | null>(null);

  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [dbModified, setDbModified] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);
  const [rowCounts, setRowCounts] = useState<Record<string, number | null>>({});

  const [currentProblemId, setCurrentProblemId] = useState<string>(PROBLEMS[0].id);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => loadSolvedFromStorage());
  const [drafts, setDrafts] = useState<Record<string, string>>(() => loadDraftsFromStorage());

  const [leftTab, setLeftTab] = useState<LeftTab>('problem');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('results');
  // Open by default on wide desktop (xl+), hidden drawer until toggled on smaller viewports
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );

  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const [editorHeightPct, setEditorHeightPct] = useState(52);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  const currentProblem = useMemo(
    () => PROBLEMS.find((p) => p.id === currentProblemId) ?? PROBLEMS[0],
    [currentProblemId]
  );

  const editorCode = drafts[currentProblem.id] ?? currentProblem.starterSql;

  const initializeDatabases = useCallback(async () => {
    setInitError(null);
    setDbReady(false);
    try {
      const [workingDb, referenceDb] = await Promise.all([
        createSeededDatabase(),
        createSeededDatabase(),
      ]);
      dbRef.current?.close();
      refDbRef.current?.close();
      dbRef.current = workingDb;
      refDbRef.current = referenceDb;
      setRowCounts(getTableRowCounts(workingDb, TABLE_NAMES));
      setDbModified(false);
      setDbReady(true);
    } catch (err) {
      setInitError(
        err instanceof Error
          ? err.message
          : 'Failed to initialize SQLite WebAssembly engine.'
      );
    }
  }, []);

  useEffect(() => {
    void initializeDatabases();
    return () => {
      dbRef.current?.close();
      refDbRef.current?.close();
    };
  }, [initializeDatabases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOLVED_KEY, JSON.stringify(Array.from(solvedIds)));
    } catch {
      // ignore storage quota errors
    }
  }, [solvedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      // ignore storage quota errors
    }
  }, [drafts]);

  const expectedResult = useMemo<QueryResult | null>(() => {
    if (!dbReady || !refDbRef.current) return null;
    try {
      return runSqlQuery(refDbRef.current, currentProblem.solutionSql);
    } catch {
      return null;
    }
  }, [dbReady, currentProblem]);

  const handleSelectProblem = useCallback((id: string) => {
    setCurrentProblemId(id);
    setQueryResult(null);
    setSqlError(null);
    setGradeResult(null);
    setConsoleTab('results');
  }, []);

  const handlePrevProblem = useCallback(() => {
    const idx = PROBLEMS.findIndex((p) => p.id === currentProblem.id);
    if (idx > 0) handleSelectProblem(PROBLEMS[idx - 1].id);
  }, [currentProblem.id, handleSelectProblem]);

  const handleNextProblem = useCallback(() => {
    const idx = PROBLEMS.findIndex((p) => p.id === currentProblem.id);
    if (idx >= 0 && idx < PROBLEMS.length - 1) handleSelectProblem(PROBLEMS[idx + 1].id);
  }, [currentProblem.id, handleSelectProblem]);

  const handleEditorChange = useCallback(
    (next: string) => {
      setDrafts((prev) => ({ ...prev, [currentProblem.id]: next }));
    },
    [currentProblem.id]
  );

  const handleResetStarter = useCallback(() => {
    setDrafts((prev) => ({ ...prev, [currentProblem.id]: currentProblem.starterSql }));
  }, [currentProblem]);

  const handleResetDatabase = useCallback(async () => {
    try {
      const freshDb = await createSeededDatabase();
      dbRef.current?.close();
      dbRef.current = freshDb;
      setRowCounts(getTableRowCounts(freshDb, TABLE_NAMES));
      setDbModified(false);
      setResetFlash(true);
      setTimeout(() => setResetFlash(false), 1600);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : 'Failed to reset database.');
      setConsoleTab('feedback');
    }
  }, []);

  const handleRunQuery = useCallback(() => {
    if (!dbRef.current) return;
    setSqlError(null);
    setGradeResult(null);

    try {
      const result = runSqlQuery(dbRef.current, editorCode);
      setQueryResult(result);
      setConsoleTab('results');

      if (result.statementType === 'mutation' || isMutatingSql(editorCode)) {
        setDbModified(true);
        setRowCounts(getTableRowCounts(dbRef.current, TABLE_NAMES));
      }
    } catch (err) {
      setQueryResult(null);
      setSqlError(err instanceof Error ? err.message : String(err));
      setConsoleTab('feedback');
    }
  }, [editorCode]);

  const handleSubmitAnswer = useCallback(() => {
    if (!dbRef.current || !expectedResult) return;
    setSqlError(null);

    try {
      const result = runSqlQuery(dbRef.current, editorCode);
      setQueryResult(result);

      if (result.statementType === 'mutation' || isMutatingSql(editorCode)) {
        setDbModified(true);
        setRowCounts(getTableRowCounts(dbRef.current, TABLE_NAMES));
      }

      const grade = gradeSubmission(currentProblem, result, expectedResult, editorCode);
      setGradeResult(grade);
      setConsoleTab('feedback');

      if (grade.passed) {
        setSolvedIds((prev) => {
          const next = new Set(prev);
          next.add(currentProblem.id);
          return next;
        });
      }
    } catch (err) {
      setQueryResult(null);
      setGradeResult(null);
      setSqlError(err instanceof Error ? err.message : String(err));
      setConsoleTab('feedback');
    }
  }, [editorCode, currentProblem, expectedResult]);

  const handlePreviewTable = useCallback((tableName: string): QueryResult | null => {
    if (!dbRef.current) return null;
    try {
      return runSqlQuery(dbRef.current, `SELECT * FROM "${tableName}" LIMIT 5;`);
    } catch {
      return null;
    }
  }, []);

  const handleRunPreviewInConsole = useCallback((tableName: string) => {
    if (!dbRef.current) return;
    setSqlError(null);
    setGradeResult(null);
    try {
      const result = runSqlQuery(dbRef.current, `SELECT * FROM "${tableName}" LIMIT 5;`);
      setQueryResult(result);
      setConsoleTab('results');
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : String(err));
      setConsoleTab('feedback');
    }
  }, []);

  const handleRunExampleSql = useCallback((sql: string): QueryResult | null => {
    if (!dbRef.current) return null;
    try {
      const result = runSqlQuery(dbRef.current, sql);
      setSqlError(null);
      setQueryResult(result);
      setConsoleTab('results');
      return result;
    } catch {
      return null;
    }
  }, []);

  const startVerticalResize = useCallback((startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    const container = rightPaneRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const offsetY = moveEvent.clientY - rect.top;
      const pct = Math.min(72, Math.max(28, (offsetY / rect.height) * 100));
      setEditorHeightPct(pct);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#09090b] text-[#ececef]">
      <Header
        currentProblem={currentProblem}
        totalProblems={PROBLEMS.length}
        solvedIds={solvedIds}
        dbReady={dbReady}
        dbModified={dbModified}
        resetFlash={resetFlash}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onPrevProblem={handlePrevProblem}
        onNextProblem={handleNextProblem}
        onResetDatabase={handleResetDatabase}
      />

      {initError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-rose-500/35 bg-[#191114] px-4 py-2 text-xs text-rose-300"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>SQLite WASM failed to initialize: {initError}</span>
          </div>
          <button
            type="button"
            onClick={() => void initializeDatabases()}
            className="flex items-center gap-1 rounded-[4px] border border-rose-500/40 px-2.5 py-1 text-xs font-medium hover:bg-rose-500/15"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace: Docked Curriculum Rail + Problem/Schema/Refresher Pane + Editor/Console Pane */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProblemDrawer
          isOpen={sidebarOpen}
          problems={PROBLEMS}
          currentProblemId={currentProblem.id}
          solvedIds={solvedIds}
          onSelectProblem={handleSelectProblem}
          onCloseMobile={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setSidebarOpen(false);
            }
          }}
        />

        <main className="grid min-w-0 min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,44%)_1fr] overflow-y-auto lg:overflow-hidden">
          <div className="min-h-[420px] lg:min-h-0 lg:h-full overflow-hidden">
            <LeftPanel
              activeTab={leftTab}
              onChangeTab={setLeftTab}
              problem={currentProblem}
              isSolved={solvedIds.has(currentProblem.id)}
              expectedResult={expectedResult}
              rowCounts={rowCounts}
              onPreviewTable={handlePreviewTable}
              onRunPreviewInConsole={handleRunPreviewInConsole}
              onRunExampleSql={handleRunExampleSql}
              onLoadSqlIntoEditor={handleEditorChange}
            />
          </div>

          <div
            ref={rightPaneRef}
            className="flex min-h-[560px] lg:min-h-0 lg:h-full flex-col overflow-hidden"
          >
            <div
              className="min-h-0 overflow-hidden"
              style={{ height: `${editorHeightPct}%` }}
            >
              <SqlEditor
                value={editorCode}
                onChange={handleEditorChange}
                onRunQuery={handleRunQuery}
                onSubmitAnswer={handleSubmitAnswer}
                onResetStarter={handleResetStarter}
                disabled={!dbReady}
              />
            </div>

            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize editor and console"
              onMouseDown={startVerticalResize}
              className="hidden lg:flex h-1 shrink-0 cursor-row-resize items-center justify-center bg-[#141418] transition-colors hover:bg-[#e2a03f]/40"
              title="Drag to resize editor and output console"
            />

            <div
              className="min-h-0 flex-1 overflow-hidden"
              style={{ height: `${100 - editorHeightPct}%` }}
            >
              <OutputConsole
                activeTab={consoleTab}
                onChangeTab={setConsoleTab}
                queryResult={queryResult}
                expectedResult={expectedResult}
                sqlError={sqlError}
                gradeResult={gradeResult}
                onResetDatabase={handleResetDatabase}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
