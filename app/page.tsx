"use client";

import { useState, useRef, useCallback } from "react";
import { X, Copy, Check, Loader2, Zap, Send, AlertTriangle, ChevronRight, RotateCcw, Download, ImageIcon, ScanSearch } from "lucide-react";

const MODELS = [
  { id: "gemini", label: "✨ Gemini" },
  { id: "groq", label: "⚡ Groq" },
];

const TASKS = [
  { id: "requirements", label: "📋 Анализ" },
  { id: "testcases", label: "🧪 Кейсы" },
  { id: "code", label: "💻 Код" },
  { id: "compare", label: "🔍 Сравнение" },
  { id: "postman", label: "📡 Postman" },
];

const MODEL_LABEL = (id) => MODELS.find((m) => m.id === id)?.label || id;
const ORDER = (id) => { const i = MODELS.findIndex((m) => m.id === id); return i === -1 ? 999 : i; };
const TASK_LABEL = (id) => TASKS.find((t) => t.id === id)?.label || id;

const SYSTEM_PROMPTS = {
  requirements: `Ты — Senior QA Engineer. Проанализируй требования. Найди противоречия, неоднозначности, пропущенные краевые случаи. Дай рекомендации. Форматируй ответ красиво.`,
  testcases: `Ты — Эксперт по тест-дизайну. Сгенерируй тест-кейсы. Формат: ID, Название, Тип (Позитивный/Негативный/Краевой), Предусловия, Шаги, Ожидаемый результат.`,
  code: `Ты — QA Automation Engineer & Security Expert. Проанализируй код: найди баги, уязвимости, проблемы производительности. Предложи рефакторинг.`,
  compare: `Ты — QA Engineer, специалист по визуальному тестированию. Тебе передаётся diff-изображение, на котором красным цветом выделены пиксельные различия между двумя скриншотами. Напиши подробный отчёт: какие элементы отличаются (позиция, цвет, размер, текст), насколько критичны расхождения, есть ли признаки регрессии. Форматируй структурированно.`,
  postman: `Ты — QA Automation Engineer, эксперт по API-тестированию. На вход получаешь Swagger/OpenAPI спецификацию (JSON или YAML). Сгенерируй полную Postman Collection v2.1 в формате JSON. Требования:
1. Для каждого эндпоинта создай папку с именем тега или пути.
2. Для каждой операции создай минимум 3 запроса: позитивный (happy path), негативный (невалидные данные / отсутствующие поля), граничные значения (пустые строки, 0, максимальные значения, спецсимволы).
3. В каждом запросе добавь pm.test() проверки: статус-код, схему ответа, время ответа < 2000ms.
4. Используй переменные окружения {{baseUrl}}, {{authToken}} где уместно.
5. Верни ТОЛЬКО валидный JSON Postman Collection v2.1 без пояснений, без markdown-обёртки, без комментариев. Начни сразу с { "info": ...`,
};

// ── Canvas diff ──────────────────────────────────────────────
function diffImages(img1: HTMLImageElement, img2: HTMLImageElement): { canvas: HTMLCanvasElement; diffPct: number } {
  const w = Math.max(img1.naturalWidth, img2.naturalWidth);
  const h = Math.max(img1.naturalHeight, img2.naturalHeight);

  const c1 = document.createElement("canvas"); c1.width = w; c1.height = h;
  const c2 = document.createElement("canvas"); c2.width = w; c2.height = h;
  const out = document.createElement("canvas"); out.width = w; out.height = h;

  const ctx1 = c1.getContext("2d")!; ctx1.drawImage(img1, 0, 0);
  const ctx2 = c2.getContext("2d")!; ctx2.drawImage(img2, 0, 0);
  const ctxOut = out.getContext("2d")!;

  const d1 = ctx1.getImageData(0, 0, w, h);
  const d2 = ctx2.getImageData(0, 0, w, h);

  // Рисуем первый скрин как полупрозрачную основу
  ctxOut.globalAlpha = 0.6;
  ctxOut.drawImage(img1, 0, 0, w, h);
  ctxOut.globalAlpha = 1;

  const outData = ctxOut.getImageData(0, 0, w, h);
  let diffCount = 0;
  const threshold = 30;

  for (let i = 0; i < d1.data.length; i += 4) {
    const dr = Math.abs(d1.data[i]   - d2.data[i]);
    const dg = Math.abs(d1.data[i+1] - d2.data[i+1]);
    const db = Math.abs(d1.data[i+2] - d2.data[i+2]);
    if (dr > threshold || dg > threshold || db > threshold) {
      outData.data[i]   = 239; // red
      outData.data[i+1] = 68;
      outData.data[i+2] = 68;
      outData.data[i+3] = 220;
      diffCount++;
    }
  }
  ctxOut.putImageData(outData, 0, 0);

  const totalPx = w * h;
  const diffPct = Math.round((diffCount / totalPx) * 1000) / 10;
  return { canvas: out, diffPct };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Компонент загрузки скриншота ─────────────────────────────
function ScreenshotDropzone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`qa-card rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[140px] p-4 ${drag ? "border-[var(--accent-from)] bg-[var(--surface-2)]" : "hover:bg-[var(--surface-faint)]"}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {preview ? (
        <>
          <img src={preview} alt={label} className="max-h-28 max-w-full rounded-lg object-contain" />
          <span className="text-[11px] text-[var(--muted)] truncate max-w-full">{file?.name}</span>
        </>
      ) : (
        <>
          <ImageIcon size={28} className="text-[var(--faint)]" />
          <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
          <span className="text-[11px] text-[var(--faint)]">Нажмите или перетащите</span>
        </>
      )}
    </div>
  );
}

// ── Вкладка сравнения ─────────────────────────────────────────
function CompareTab() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [diffCanvas, setDiffCanvas] = useState<HTMLCanvasElement | null>(null);
  const [diffPct, setDiffPct] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const canCompare = file1 && file2 && !loading;

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setLoading(true);
    setDiffCanvas(null);
    setDiffPct(null);
    try {
      const [img1, img2] = await Promise.all([loadImage(file1), loadImage(file2)]);
      const { canvas, diffPct: pct } = diffImages(img1, img2);
      setDiffCanvas(canvas);
      setDiffPct(pct);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile1(null); setFile2(null);
    setDiffCanvas(null); setDiffPct(null);
  };

  const handleDownloadDiff = () => {
    if (!diffCanvas) return;
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
    const a = document.createElement("a");
    a.href = diffCanvas.toDataURL("image/png");
    a.download = `diff_${ts}.png`; a.click();
  };

  const diffColor = diffPct === null ? "" : diffPct === 0 ? "text-emerald-600" : diffPct < 5 ? "text-amber-500" : "text-red-500";
  const diffLabel = diffPct === null ? "" : diffPct === 0 ? "Скриншоты идентичны ✓" : `Найдено расхождений: ${diffPct}%`;

  return (
    <div className="space-y-3">
      {/* Загрузка — скрываем после результата */}
      {!diffCanvas && (
        <div className="grid grid-cols-2 gap-3">
          <ScreenshotDropzone label="Эталон" file={file1} onFile={setFile1} />
          <ScreenshotDropzone label="Проверяемый" file={file2} onFile={setFile2} />
        </div>
      )}

      {/* Кнопка сравнения */}
      {!diffCanvas && (
        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className="qa-run group w-full flex items-center justify-center gap-2.5 py-3.5 sm:py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" />Сравниваю…</>
            : <><ScanSearch size={18} className="transition-transform group-hover:scale-110" />Сравнить скриншоты</>
          }
        </button>
      )}

      {/* Результат — три изображения */}
      {diffCanvas && diffPct !== null && (
        <>
          {/* Заголовок с процентом */}
          <div className="qa-card rounded-2xl px-4 py-3 flex items-center justify-between qa-rise">
            <span className={`text-sm font-bold qa-mono ${diffColor}`}>{diffLabel}</span>
            <div className="flex items-center gap-3">
              <button onClick={handleDownloadDiff} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
                <Download size={13} /> Скачать diff
              </button>
            </div>
          </div>

          {/* Три скрина */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 qa-rise">
            {[
              { label: "Эталон", src: file1 ? URL.createObjectURL(file1) : "", tag: "bg-emerald-100 text-emerald-700" },
              { label: "Проверяемый", src: file2 ? URL.createObjectURL(file2) : "", tag: "bg-sky-100 text-sky-700" },
              { label: "Расхождения", src: diffCanvas.toDataURL(), tag: diffPct === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600" },
            ].map(({ label, src, tag }) => (
              <div key={label} className="qa-card rounded-xl overflow-hidden flex flex-col">
                <div className={`px-3 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-faint)]`}>
                  <span className="text-xs font-semibold text-[var(--text-2)]">{label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tag}`}>
                    {label === "Расхождения" ? (diffPct === 0 ? "0%" : `${diffPct}%`) : label === "Эталон" ? "base" : "actual"}
                  </span>
                </div>
                <div className="p-2 bg-[var(--surface-faint)] flex items-center justify-center min-h-[120px]">
                  <img src={src} alt={label} className="max-w-full rounded object-contain" style={{ maxHeight: 260 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка сброса */}
          <button
            onClick={handleReset}
            className="qa-rise w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--accent-from)] hover:border-[var(--accent-from)]/40 hover:bg-[var(--surface-2)] transition-all"
          >
            <RotateCcw size={14} /> Новое сравнение
          </button>
        </>
      )}
    </div>
  );
}

// ── Вкладка Postman ───────────────────────────────────────────
function PostmanTab({ models }: { models: string[] }) {
  const [swagger, setSwagger] = useState("");
  const [loading, setLoading] = useState(false);
  const [collectionJson, setCollectionJson] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canRun = swagger.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    if (!canRun) return;
    setLoading(true);
    setCollectionJson("");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "postman",
          models: [models[0]],
          model: models[0],
          systemPrompt: SYSTEM_PROMPTS.postman,
          prompt: swagger.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const raw = data.results?.[0]?.text || "";
      // Вырезаем JSON если модель всё же обернула в ```
      const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
      setCollectionJson(clean);
    } catch {
      setError("Произошла ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  const getTimestamp = () => {
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  const handleDownloadJson = () => {
    const blob = new Blob([collectionJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `postman_collection_${getTimestamp()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJs = () => {
    // Оборачиваем коллекцию в Newman-ready JS скрипт
    const js = `// Newman-ready Postman Collection\n// Run: newman run collection.js\nconst collection = ${collectionJson};\nmodule.exports = collection;`;
    const blob = new Blob([js], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `postman_collection_${getTimestamp()}.js`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(collectionJson); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handleReset = () => { setSwagger(""); setCollectionJson(""); setError(""); };

  // Считаем кол-во сгенерированных запросов
  let requestCount = 0;
  if (collectionJson) {
    try { requestCount = (JSON.parse(collectionJson)?.item || []).flatMap((f: any) => f.item || [f]).length; } catch {}
  }

  return (
    <div className="space-y-3">
      {!collectionJson && !error && (
        <>
          <div className="qa-card rounded-2xl p-2">
            <div className="relative">
              <textarea
                placeholder="Вставьте Swagger / OpenAPI JSON или YAML…"
                className="qa-mono w-full h-56 p-3 sm:p-4 bg-transparent rounded-xl focus:outline-none resize-y text-sm text-[var(--text)] placeholder:text-[var(--faint)] leading-relaxed"
                value={swagger}
                onChange={(e) => setSwagger(e.target.value)}
              />
              {swagger && (
                <button onClick={() => setSwagger("")} className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all">
                  <X size={13} />
                </button>
              )}
              <div className="absolute bottom-2.5 right-3.5 text-[10px] text-[var(--faint)] select-none pointer-events-none qa-mono">
                {swagger.length} симв.
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canRun}
            className="qa-run group w-full flex items-center justify-center gap-2.5 py-3.5 sm:py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" />Генерирую коллекцию…</>
              : <><Zap size={18} className="transition-transform group-hover:scale-110" />Сгенерировать Postman Collection</>
            }
          </button>
        </>
      )}

      {error && (
        <div className="qa-card rounded-2xl p-4 flex items-start gap-3 text-sm text-[var(--error)] qa-rise">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="qa-mono leading-relaxed">{error}</span>
        </div>
      )}

      {collectionJson && (
        <>
          {/* Шапка результата */}
          <div className="qa-card rounded-2xl px-4 py-3 flex items-center justify-between qa-rise">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-from)] shadow-[0_0_6px_var(--accent-from)]" />
              <span className="text-sm font-semibold text-[var(--text-2)]">
                Коллекция готова
                {requestCount > 0 && <span className="ml-2 text-xs font-normal text-[var(--muted)] qa-mono">{requestCount} запросов</span>}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
                {copied ? <><Check size={13} /> Скопировано</> : <><Copy size={13} /> Копировать</>}
              </button>
              <button onClick={handleDownloadJson} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
                <Download size={13} /> JSON
              </button>
              <button onClick={handleDownloadJs} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
                <Download size={13} /> JS
              </button>
            </div>
          </div>

          {/* Превью JSON */}
          <div className="qa-card rounded-2xl overflow-hidden qa-rise">
            <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-faint)]">
              <span className="text-xs font-semibold text-[var(--muted)] qa-mono">postman_collection.json</span>
            </div>
            <pre className="qa-mono p-4 text-xs text-[var(--text-2)] leading-relaxed overflow-auto max-h-72 whitespace-pre-wrap break-all">
              {collectionJson.length > 2000 ? collectionJson.slice(0, 2000) + "\n\n… (скачайте файл для полного содержимого)" : collectionJson}
            </pre>
          </div>

          <button
            onClick={handleReset}
            className="qa-rise w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--accent-from)] hover:border-[var(--accent-from)]/40 hover:bg-[var(--surface-2)] transition-all"
          >
            <RotateCcw size={14} /> Новая коллекция
          </button>
        </>
      )}
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────
export default function Home() {
  const [inputByTask, setInputByTask] = useState<Record<string, string>>({});
  const [resultsByTask, setResultsByTask] = useState<Record<string, any[]>>({});
  const [errorByTask, setErrorByTask] = useState<Record<string, string>>({});
  const [models, setModels] = useState(["gemini"]);
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [prompts, setPrompts] = useState({ ...SYSTEM_PROMPTS });
  const [showPrompt, setShowPrompt] = useState(false);

  const isCompare = taskType === "compare";
  const isPostman = taskType === "postman";
  const results = resultsByTask[taskType] || [];
  const error = errorByTask[taskType] || "";
  const input = inputByTask[taskType] || "";
  const setInput = (v: string) => setInputByTask((p) => ({ ...p, [taskType]: v }));

  const currentPrompt = prompts[taskType] || "";
  const promptEmpty = !currentPrompt.trim();
  const promptCustomized = currentPrompt !== SYSTEM_PROMPTS[taskType] && !promptEmpty;
  const setCurrentPrompt = (v: string) => setPrompts((p) => ({ ...p, [taskType]: v }));
  const resetPrompt = () => setPrompts((p) => ({ ...p, [taskType]: SYSTEM_PROMPTS[taskType] }));

  const toggleModel = (id: string) => {
    setModels((prev) => prev.includes(id) ? prev.length > 1 ? prev.filter((x) => x !== id) : prev : [...prev, id]);
  };

  const handleAnalyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setErrorByTask((p) => ({ ...p, [taskType]: "" }));
    setResultsByTask((p) => ({ ...p, [taskType]: [] }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, taskType, models, model: models[0], systemPrompt: currentPrompt.trim() || undefined }),
      });
      const data = await res.json();
      if (data.error) setErrorByTask((p) => ({ ...p, [taskType]: data.error }));
      else setResultsByTask((p) => ({ ...p, [taskType]: data.results || [] }));
    } catch {
      setErrorByTask((p) => ({ ...p, [taskType]: "Произошла ошибка сети." }));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setInputByTask({}); setResultsByTask({}); setErrorByTask({}); };

  const handleCopy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleAnalyze(); }
  };

  const getTimestamp = () => {
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  const handleDownloadTxt = (text: string) => {
    const prefix = taskType === "requirements" ? "analysis" : taskType === "testcases" ? "testcases" : "code";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${prefix}_${getTimestamp()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = (text: string) => {
    const lines = text.split("\n").filter(Boolean);
    const rows = lines.map((line) => line.split(/\t|(?<=\|)(?=\S)|^\||\|$/).map((cell) => `"${cell.trim().replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `testcases_${getTimestamp()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const chip = "flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-center rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.97] leading-tight px-2";
  const chipOn = "text-[var(--accent-fg)] bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] border-transparent shadow-[var(--accent-shadow)]";
  const chipOff = "text-[var(--muted)] bg-[var(--surface)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]";

  const multi = results.length > 1 || (loading && models.length > 1);

  return (
    <div className="qa-root">
      <div className="qa-bg" />
      <div className="qa-grid" />

      <div className="qa-layout">
        <main className="qa-main">

          {/* Хедер */}
          <header className="text-center mb-5 qa-rise">
            <h1 className="qa-display qa-title">QA AI Assistant</h1>
          </header>

          {/* Панель выбора */}
          <section className="qa-card rounded-2xl p-4 sm:p-6 mb-3 qa-rise" style={{ animationDelay: "0.08s" }}>
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-0">
              {!isCompare && (
                <>
                  <div className="flex-1 sm:pr-6">
                    <h3 className="qa-section-label"><span className="qa-dot" />Выберите модель</h3>
                    <div className="flex gap-2">
                      {MODELS.map((m) => {
                        const on = models.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleModel(m.id)} className={`${chip} ${on ? chipOn : chipOff}`}>
                            {on && <Check size={13} className="-ml-0.5 shrink-0" />}
                            <span className="truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sm:w-px sm:bg-[var(--border)] sm:mx-0" />
                </>
              )}
              <div className={`flex-1 ${!isCompare ? "sm:pl-6" : ""}`}>
                <h3 className="qa-section-label"><span className="qa-dot" />Тип задачи</h3>
                <div className="flex gap-2 flex-wrap">
                  {TASKS.map((t) => (
                    <button key={t.id} onClick={() => setTaskType(t.id)} className={`${chip} ${taskType === t.id ? chipOn : chipOff}`}>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Вкладка сравнения */}
          {isCompare ? (
            <CompareTab />
          ) : isPostman ? (
            <PostmanTab models={models} />
          ) : (
            <>
              {/* Системный промпт */}
              <section className="qa-card rounded-2xl mb-3 qa-rise overflow-hidden" style={{ animationDelay: "0.12s" }}>
                <button
                  onClick={() => setShowPrompt((v) => !v)}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 text-left hover:bg-[var(--surface-faint)] transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <ChevronRight size={14} className="text-[var(--accent-from)] shrink-0" />
                    <span className="text-sm font-semibold text-[var(--text-2)]">Системный промпт</span>
                    {promptCustomized && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] shrink-0" title="изменён" />}
                  </span>
                  <ChevronRight size={16} className={`text-[var(--muted)] transition-transform duration-200 shrink-0 ${showPrompt ? "rotate-90" : ""}`} />
                </button>
                {showPrompt && (
                  <div className="px-4 sm:px-6 pb-5">
                    <p className="text-xs text-[var(--faint)] mb-3 leading-relaxed">
                      Промпт для задачи «<span className="text-[var(--muted)]">{TASK_LABEL(taskType)}</span>». При желании, отредактируйте под свои задачи.
                    </p>
                    <textarea
                      value={currentPrompt}
                      onChange={(e) => setCurrentPrompt(e.target.value)}
                      placeholder="Добавьте промпт…"
                      className="qa-mono w-full h-36 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent-from)]/60 focus:ring-2 focus:ring-[var(--accent-from)]/12 resize-y text-sm text-[var(--text)] placeholder:text-[var(--faint)] leading-relaxed transition-all"
                    />
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[11px] text-[var(--faint)] qa-mono">{currentPrompt.length} симв.</span>
                      <button
                        onClick={resetPrompt}
                        disabled={!promptCustomized}
                        className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] disabled:opacity-35 disabled:hover:text-[var(--muted)] disabled:cursor-default transition-colors"
                      >
                        <RotateCcw size={12} /> Вернуть стандартный
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Поле ввода */}
              <section className="qa-card rounded-2xl p-2 mb-3 qa-rise" style={{ animationDelay: "0.16s" }}>
                <div className="relative">
                  <textarea
                    placeholder="Добавьте текст…"
                    className="qa-mono w-full h-44 sm:h-52 p-3 sm:p-4 pr-10 bg-transparent rounded-xl focus:outline-none resize-y text-sm text-[var(--text)] placeholder:text-[var(--faint)] leading-relaxed"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {input && (
                    <button onClick={handleClear} title="Очистить" aria-label="Очистить поле" className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all">
                      <X size={13} />
                    </button>
                  )}
                  <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-[10px] text-[var(--faint)] select-none pointer-events-none qa-mono">
                    <span className="flex items-center gap-1 text-red-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Избегайте конфиденциальных данных
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="hidden sm:inline">⌘/Ctrl + Enter</span>
                      <span>{input.length} симв.</span>
                    </span>
                  </div>
                </div>
              </section>

              {/* Кнопка запуска */}
              <button
                onClick={handleAnalyze}
                disabled={loading || !input.trim()}
                className="qa-run qa-rise group w-full flex items-center justify-center gap-2.5 py-3.5 sm:py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ animationDelay: "0.20s" }}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" />Анализирую…</> : <><Zap size={18} className="transition-transform group-hover:scale-110" />Запустить анализ</>}
              </button>

              {/* Ошибка */}
              {error && (
                <div className="mt-4 qa-card rounded-2xl p-4 flex items-start gap-3 text-sm text-[var(--error)] qa-rise">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span className="qa-mono leading-relaxed">{error}</span>
                </div>
              )}

              {/* Результаты */}
              {(loading || results.length > 0) && (
                <div className={`mt-4 grid gap-4 ${multi ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                  {loading
                    ? models.slice().sort((a, b) => ORDER(a) - ORDER(b)).map((id) => (
                        <div key={id} className="qa-card rounded-2xl overflow-hidden qa-rise">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-faint)]">
                            <span className="text-xs font-semibold text-[var(--muted)] qa-mono">{MODEL_LABEL(id)}</span>
                            <Loader2 size={13} className="animate-spin text-[var(--accent-from)]" />
                          </div>
                          <div className="p-4 space-y-2.5 animate-pulse">
                            {[5, 6, 4, 5].map((w, i) => <div key={i} className={`h-2.5 rounded bg-[var(--surface-2)] w-${w}/6`} />)}
                          </div>
                        </div>
                      ))
                    : results.slice().sort((a, b) => ORDER(a.model) - ORDER(b.model)).map((r) => {
                        const label = r.label || MODEL_LABEL(r.model);
                        const copied = copiedKey === r.model;
                        return (
                          <div key={r.model} className="qa-card rounded-2xl overflow-hidden qa-rise flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-faint)]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${r.ok ? "bg-[var(--accent-from)] shadow-[0_0_6px_var(--accent-from)]" : "bg-[var(--error)]"}`} />
                                <span className="text-xs font-semibold text-[var(--text-2)] qa-mono truncate">{label}</span>
                              </div>
                              {r.ok && (
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                  {taskType === "testcases" && (
                                    <button onClick={() => handleDownloadCsv(r.text)} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors" title="Скачать CSV">
                                      <Download size={13} /> CSV
                                    </button>
                                  )}
                                  <button onClick={() => handleDownloadTxt(r.text)} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors" title="Скачать TXT">
                                    <Download size={13} /> TXT
                                  </button>
                                  <button onClick={() => handleCopy(r.model, r.text)} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
                                    {copied ? <><Check size={13} /> Скопировано</> : <><Copy size={13} /> Копировать</>}
                                  </button>
                                </div>
                              )}
                              {!r.ok && (
                                <button onClick={() => handleCopy(r.model, r.text)} className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors shrink-0 ml-2">
                                  {copied ? <><Check size={13} /> Скопировано</> : <><Copy size={13} /> Копировать</>}
                                </button>
                              )}
                            </div>
                            <div className={`qa-mono p-4 sm:p-5 whitespace-pre-wrap text-sm leading-relaxed min-h-[120px] ${r.ok ? "text-[var(--text-2)]" : "text-[var(--error)]"}`}>
                              {r.ok ? r.text : `❌ Ошибка: ${r.text}`}
                            </div>
                          </div>
                        );
                      })}
                </div>
              )}
            </>
          )}
        </main>

        {/* Футер */}
        <footer className="qa-footer">
          <a href="https://t.me/Alexey_Saraev" target="_blank" rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors">
            <Send size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            Created by Alexey Saraev
          </a>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .qa-root {
          --bg: #f0fbff;
          --text: #0a1f26;
          --text-2: #164e63;
          --muted: #2e7d9e;
          --faint: #7dbfcf;
          --error: #b91c1c;
          --card-bg: rgba(255,255,255,0.82);
          --card-border: rgba(6,182,212,0.16);
          --border: rgba(6,182,212,0.16);
          --border-strong: rgba(6,182,212,0.38);
          --surface: rgba(6,182,212,0.05);
          --surface-2: rgba(6,182,212,0.09);
          --surface-3: rgba(6,182,212,0.15);
          --surface-faint: rgba(6,182,212,0.03);
          --grid: rgba(6,182,212,0.10);
          --glow1: rgba(6,182,212,0.14);
          --glow2: rgba(2,132,199,0.10);
          --card-shadow: 0 12px 40px -16px rgba(2,100,140,0.14);
          --card-inset: inset 0 1px 0 rgba(255,255,255,0.85);
          --title-grad: linear-gradient(135deg, #0e7490 0%, #0284c7 50%, #06b6d4 100%);
          --accent-from: #0284c7;
          --accent-to: #0369a1;
          --accent-fg: #f0fbff;
          --accent-shadow: 0 10px 30px -10px rgba(2,132,199,0.45);
          font-family: 'Hanken Grotesk', system-ui, sans-serif;
          color: var(--text);
          background: var(--bg);
          -webkit-font-smoothing: antialiased;
          min-height: 100dvh;
        }

        .qa-layout { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100dvh; }
        .qa-main { flex: 1; width: 100%; max-width: 720px; margin: 0 auto; padding: 20px 16px 12px; }
        @media (min-width: 640px) { .qa-main { padding: 32px 24px 16px; } }
        .qa-footer { text-align: center; padding: 12px 16px 16px; position: relative; z-index: 1; }

        .qa-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .qa-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .qa-title {
          font-size: clamp(1.5rem, 5vw, 2.25rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1.05;
          background-image: var(--title-grad);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .qa-section-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 600; color: var(--muted);
          text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 10px;
        }
        .qa-dot {
          display: inline-block; height: 6px; width: 6px; border-radius: 50%;
          background: var(--accent-from); box-shadow: 0 0 7px var(--accent-from); flex-shrink: 0;
        }

        .qa-run {
          color: var(--accent-fg);
          background: linear-gradient(90deg, var(--accent-from), var(--accent-to));
          box-shadow: var(--accent-shadow);
        }
        .qa-run:not(:disabled):hover { box-shadow: 0 20px 56px -14px rgba(2,132,199,0.55); }

        .qa-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(62% 48% at 18% -4%, var(--glow1), transparent 70%),
                      radial-gradient(54% 50% at 96% 104%, var(--glow2), transparent 70%), var(--bg);
        }
        .qa-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
                  mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
        }
        .qa-card {
          background: var(--card-bg); border: 1px solid var(--card-border);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          box-shadow: var(--card-shadow), var(--card-inset);
        }

        @keyframes qa-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .qa-rise { animation: qa-rise 0.65s cubic-bezier(0.2,0.7,0.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .qa-rise { animation: none; } }
      `}</style>
    </div>
  );
}
