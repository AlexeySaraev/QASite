"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2, Zap, Send, AlertTriangle, ChevronRight, RotateCcw, Download } from "lucide-react";

const MODELS = [
  { id: "gemini", label: "✨ Gemini" },
  { id: "groq", label: "⚡ Groq" },
];

const TASKS = [
  { id: "requirements", label: "📋 Анализ" },
  { id: "testcases", label: "🧪 Кейсы" },
  { id: "code", label: "💻 Код" },
];

const MODEL_LABEL = (id) => MODELS.find((m) => m.id === id)?.label || id;
const ORDER = (id) => {
  const i = MODELS.findIndex((m) => m.id === id);
  return i === -1 ? 999 : i;
};
const TASK_LABEL = (id) => TASKS.find((t) => t.id === id)?.label || id;

const SYSTEM_PROMPTS = {
  requirements: `Ты — Senior QA Engineer. Проанализируй требования. Найди противоречия, неоднозначности, пропущенные краевые случаи. Дай рекомендации. Форматируй ответ красиво.`,
  testcases: `Ты — Эксперт по тест-дизайну. Сгенерируй тест-кейсы. Формат: ID, Название, Тип (Позитивный/Негативный/Краевой), Предусловия, Шаги, Ожидаемый результат.`,
  code: `Ты — QA Automation Engineer & Security Expert. Проанализируй код: найди баги, уязвимости, проблемы производительности. Предложи рефакторинг.`,
};

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [models, setModels] = useState(["gemini"]);
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [prompts, setPrompts] = useState({ ...SYSTEM_PROMPTS });
  const [showPrompt, setShowPrompt] = useState(false);

  const currentPrompt = prompts[taskType];
  const promptEmpty = !currentPrompt.trim();
  const promptCustomized = currentPrompt !== SYSTEM_PROMPTS[taskType] && !promptEmpty;
  const setCurrentPrompt = (v) => setPrompts((p) => ({ ...p, [taskType]: v }));
  const resetPrompt = () => setPrompts((p) => ({ ...p, [taskType]: SYSTEM_PROMPTS[taskType] }));

  const toggleModel = (id) => {
    setModels((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((x) => x !== id) : prev
        : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, taskType, models, model: models[0], systemPrompt: currentPrompt.trim() || undefined }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResults(data.results || []);
    } catch {
      setError("Произошла ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setInput(""); setResults([]); setError(""); };

  const handleCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleAnalyze(); }
  };

  const getTimestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  const handleDownloadTxt = (text) => {
    const prefix = taskType === "requirements" ? "analysis" : taskType === "testcases" ? "testcases" : "code";
    const filename = `${prefix}_${getTimestamp()}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = (text) => {
    const lines = text.split("\n").filter(Boolean);
    const rows = lines.map((line) => {
      // Экранируем поля: оборачиваем в кавычки, внутренние кавычки удваиваем
      return line.split(/\t|(?<=\|)(?=\S)|^\||\|$/).map((cell) =>
        `"${cell.trim().replace(/"/g, '""')}"`
      ).join(",");
    });
    const csv = "\uFEFF" + rows.join("\n"); // BOM для Excel
    const filename = `testcases_${getTimestamp()}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
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

      {/* Обёртка: контент + прибитый футер */}
      <div className="qa-layout">
        <main className="qa-main">

          {/* Хедер */}
          <header className="text-center mb-5 qa-rise">
            <h1 className="qa-display qa-title">QA AI Assistant</h1>
          </header>

          {/* Панель выбора */}
          <section className="qa-card rounded-2xl p-4 sm:p-6 mb-3 qa-rise" style={{ animationDelay: "0.08s" }}>
            {/* На мобиле — стопкой, на десктопе — в ряд */}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-0">
              <div className="flex-1 sm:pr-6">
                <h3 className="qa-section-label">
                  <span className="qa-dot" />
                  Выберите модель
                </h3>
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

              <div className="flex-1 sm:pl-6">
                <h3 className="qa-section-label">
                  <span className="qa-dot" />
                  Тип задачи
                </h3>
                <div className="flex gap-2">
                  {TASKS.map((t) => (
                    <button key={t.id} onClick={() => setTaskType(t.id)} className={`${chip} ${taskType === t.id ? chipOn : chipOff}`}>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Системный промпт */}
          <section className="qa-card rounded-2xl mb-3 qa-rise overflow-hidden" style={{ animationDelay: "0.12s" }}>
            <button
              onClick={() => setShowPrompt((v) => !v)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 text-left hover:bg-[var(--surface-faint)] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ChevronRight size={14} className="text-[var(--accent-from)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--text-2)]">Системный промпт</span>
                {promptCustomized && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] shrink-0" title="изменён" />
                )}
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
                <button
                  onClick={handleClear}
                  title="Очистить"
                  aria-label="Очистить поле"
                  className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all"
                >
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
            {loading ? (
              <><Loader2 size={18} className="animate-spin" />Анализирую…</>
            ) : (
              <><Zap size={18} className="transition-transform group-hover:scale-110" />Запустить анализ</>
            )}
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
                        {[5, 6, 4, 5].map((w, i) => (
                          <div key={i} className={`h-2.5 rounded bg-[var(--surface-2)] w-${w}/6`} />
                        ))}
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
                                <button
                                  onClick={() => handleDownloadCsv(r.text)}
                                  className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors"
                                  title="Скачать CSV"
                                >
                                  <Download size={13} /> CSV
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadTxt(r.text)}
                                className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors"
                                title="Скачать TXT"
                              >
                                <Download size={13} /> TXT
                              </button>
                              <button
                                onClick={() => handleCopy(r.model, r.text)}
                                className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors"
                              >
                                {copied ? <><Check size={13} /> Скопировано</> : <><Copy size={13} /> Копировать</>}
                              </button>
                            </div>
                          )}
                          {!r.ok && (
                            <button
                              onClick={() => handleCopy(r.model, r.text)}
                              className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors shrink-0 ml-2"
                            >
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
        </main>

        {/* Футер — прибит к низу */}
        <footer className="qa-footer">
          <a
            href="https://t.me/Alexey_Saraev"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent-from)] transition-colors"
          >
            <Send size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
            Created by Alexey Saraev
          </a>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── Светлая тема — Arctic ── */
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

        /* Layout: flex-column, футер прибит к низу */
        .qa-layout {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
        }
        .qa-main {
          flex: 1;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 20px 16px 12px;
        }
        @media (min-width: 640px) {
          .qa-main { padding: 32px 24px 16px; }
        }
        .qa-footer {
          text-align: center;
          padding: 12px 16px 16px;
          position: relative;
          z-index: 1;
        }

        .qa-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .qa-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .qa-title {
          font-size: clamp(2rem, 8vw, 3.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.05;
          background-image: var(--title-grad);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
        }

        .qa-section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 10px;
        }
        .qa-dot {
          display: inline-block;
          height: 6px; width: 6px;
          border-radius: 50%;
          background: var(--accent-from);
          box-shadow: 0 0 7px var(--accent-from);
          flex-shrink: 0;
        }

        .qa-run {
          color: var(--accent-fg);
          background: linear-gradient(90deg, var(--accent-from), var(--accent-to));
          box-shadow: var(--accent-shadow);
        }
        .qa-run:not(:disabled):hover {
          box-shadow: 0 20px 56px -14px rgba(2,132,199,0.55);
        }

        .qa-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(62% 48% at 18% -4%, var(--glow1), transparent 70%),
            radial-gradient(54% 50% at 96% 104%, var(--glow2), transparent 70%),
            var(--bg);
        }
        .qa-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(var(--grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
                  mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
        }

        .qa-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: var(--card-shadow), var(--card-inset);
        }

        @keyframes qa-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .qa-rise { animation: qa-rise 0.65s cubic-bezier(0.2,0.7,0.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .qa-rise { animation: none; } }
      `}</style>
    </div>
  );
}
