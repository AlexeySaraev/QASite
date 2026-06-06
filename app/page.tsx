"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Loader2, Zap, Send, AlertTriangle, Terminal, ChevronDown, RotateCcw, Sun, Moon } from "lucide-react";

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

// Стандартные системные промпты (должны совпадать с фолбэком в /api/analyze)
const SYSTEM_PROMPTS = {
  requirements: `Ты — Senior QA Engineer. Проанализируй требования. Найди противоречия, неоднозначности, пропущенные краевые случаи. Дай рекомендации. Форматируй ответ красиво.`,
  testcases: `Ты — Эксперт по тест-дизайну. Сгенерируй тест-кейсы. Формат: ID, Название, Тип (Позитивный/Негативный/Краевой), Предусловия, Шаги, Ожидаемый результат.`,
  code: `Ты — QA Automation Engineer & Security Expert. Проанализируй код: найди баги, уязвимости, проблемы производительности. Предложи рефакторинг.`,
};

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]); // [{ model, label, ok, text }]
  const [error, setError] = useState("");
  const [models, setModels] = useState(["gemini"]); // мультивыбор, по умолчанию одна
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light'

  // системный промпт, отдельно для каждого типа задачи (правки сохраняются при переключении)
  const [prompts, setPrompts] = useState({ ...SYSTEM_PROMPTS });
  const [showPrompt, setShowPrompt] = useState(false);

  // загрузка/сохранение выбранной темы
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qa-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("qa-theme", theme); } catch {}
  }, [theme]);

  const currentPrompt = prompts[taskType];
  const promptCustomized = currentPrompt !== SYSTEM_PROMPTS[taskType];
  const setCurrentPrompt = (v) => setPrompts((p) => ({ ...p, [taskType]: v }));
  const resetPrompt = () => setPrompts((p) => ({ ...p, [taskType]: SYSTEM_PROMPTS[taskType] }));

  const toggleModel = (id) => {
    setModels((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((x) => x !== id)
          : prev
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
        body: JSON.stringify({ prompt: input, taskType, models, model: models[0], systemPrompt: currentPrompt }),
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

  const handleClear = () => {
    setInput("");
    setResults([]);
    setError("");
  };

  const handleCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      /* clipboard недоступен */
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const chip =
    "flex-1 min-h-[50px] flex items-center justify-center gap-1.5 text-center rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.97] leading-tight px-2";
  const chipOn =
    "text-[#04140f] bg-gradient-to-br from-[#34d399] to-[#2dd4bf] border-transparent shadow-[0_10px_30px_-10px_rgba(45,212,191,0.7)]";
  const chipOff =
    "text-[var(--muted)] bg-[var(--surface)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]";

  const multi = results.length > 1 || (loading && models.length > 1);

  return (
    <div className={`qa-root ${theme === "light" ? "qa-light" : ""} min-h-screen w-full`}>
      <div className="qa-bg" />
      <div className="qa-grid" />

      {/* Переключатель темы */}
      <button
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        aria-label="Переключить тему"
        title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        className="qa-card fixed top-4 right-4 z-20 h-10 w-10 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[#34d399] transition-colors"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <main className="relative max-w-3xl mx-auto px-5 py-16 sm:py-24">

        {/* Хедер */}
        <header className="text-center mb-12 qa-rise">
          <h1 className="qa-display qa-title text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            QA AI Assistant
          </h1>
        </header>

        {/* Панель выбора */}
        <section className="qa-card rounded-2xl p-6 sm:p-7 mb-5 qa-rise" style={{ animationDelay: "0.08s" }}>
          <div className="grid sm:grid-cols-2">
            <div className="sm:pr-7">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)] mb-3.5 uppercase tracking-[0.14em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
                Выберите модель
              </h3>
              <div className="flex gap-2.5">
                {MODELS.map((m) => {
                  const on = models.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleModel(m.id)} className={`${chip} ${on ? chipOn : chipOff}`}>
                      {on && <Check size={14} className="-ml-0.5" />}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:pl-7 sm:border-l border-[var(--border)] mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)] mb-3.5 uppercase tracking-[0.14em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]" />
                Тип задачи
              </h3>
              <div className="flex gap-2.5">
                {TASKS.map((t) => (
                  <button key={t.id} onClick={() => setTaskType(t.id)} className={`${chip} ${taskType === t.id ? chipOn : chipOff}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Системный промпт — просмотр / редактирование / сброс */}
        <section className="qa-card rounded-2xl mb-5 qa-rise overflow-hidden" style={{ animationDelay: "0.12s" }}>
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--surface-faint)] transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Terminal size={15} className="text-[#34d399]" />
              <span className="text-sm font-semibold text-[var(--text-2)]">Системный промпт</span>
              {promptCustomized && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" title="изменён" />
              )}
            </span>
            <ChevronDown size={18} className={`text-[var(--muted)] transition-transform duration-200 ${showPrompt ? "rotate-180" : ""}`} />
          </button>

          {showPrompt && (
            <div className="px-6 pb-6">
              <p className="text-xs text-[var(--faint)] mb-3 leading-relaxed">
                Промпт для задачи «<span className="text-[var(--muted)]">{TASK_LABEL(taskType)}</span>». Отредактируйте под себя — запрос уйдёт с вашей версией.
              </p>
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="qa-mono w-full h-44 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:outline-none focus:border-[#34d399]/50 focus:ring-2 focus:ring-[#34d399]/15 resize-y text-sm text-[var(--text)] leading-relaxed transition-all"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-[var(--faint)] qa-mono">{currentPrompt.length} симв.</span>
                <button
                  onClick={resetPrompt}
                  disabled={!promptCustomized}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[#34d399] disabled:opacity-35 disabled:hover:text-[var(--muted)] disabled:cursor-default transition-colors"
                >
                  <RotateCcw size={13} /> Вернуть стандартный
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Поле ввода */}
        <section className="qa-card rounded-2xl p-2 mb-5 qa-rise" style={{ animationDelay: "0.16s" }}>
          <div className="relative">
            <textarea
              placeholder="Добавьте текст или код…"
              className="qa-mono w-full h-56 p-4 pr-12 bg-transparent rounded-xl focus:outline-none resize-y text-sm text-[var(--text)] placeholder:text-[var(--faint)] leading-relaxed"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {input && (
              <button
                onClick={handleClear}
                title="Очистить"
                aria-label="Очистить поле"
                className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all"
              >
                <X size={15} />
              </button>
            )}
            <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] text-[var(--faint)] select-none pointer-events-none qa-mono">
              <span className="hidden sm:inline">⌘/Ctrl + Enter</span>
              <span>{input.length} симв.</span>
            </div>
          </div>
        </section>

        {/* Кнопка запуска */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          className="qa-rise group w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold text-[#04140f] bg-gradient-to-r from-[#34d399] to-[#2dd4bf] shadow-[0_14px_44px_-14px_rgba(45,212,191,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_56px_-14px_rgba(45,212,191,0.95)] active:translate-y-0 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0"
          style={{ animationDelay: "0.24s" }}
        >
          {loading ? (
            <>
              <Loader2 size={19} className="animate-spin" />
              Анализирую…
            </>
          ) : (
            <>
              <Zap size={19} className="transition-transform group-hover:scale-110" />
              Запустить анализ
            </>
          )}
        </button>

        {/* Общая ошибка */}
        {error && (
          <div className="mt-7 qa-card rounded-2xl p-5 flex items-start gap-3 text-sm text-[var(--error)] qa-rise">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span className="qa-mono leading-relaxed">{error}</span>
          </div>
        )}

        {/* Результаты — отдельный блок на каждую модель */}
        {(loading || results.length > 0) && (
          <div className={`mt-7 grid gap-5 ${multi ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {loading
              ? models.slice().sort((a, b) => ORDER(a) - ORDER(b)).map((id) => (
                  <div key={id} className="qa-card rounded-2xl overflow-hidden qa-rise">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-faint)]">
                      <span className="text-xs font-semibold text-[var(--muted)] qa-mono">{MODEL_LABEL(id)}</span>
                      <Loader2 size={14} className="animate-spin text-[#34d399]" />
                    </div>
                    <div className="p-5 sm:p-6 space-y-3 animate-pulse">
                      <div className="h-3 rounded bg-[var(--surface-2)] w-5/6" />
                      <div className="h-3 rounded bg-[var(--surface-2)] w-full" />
                      <div className="h-3 rounded bg-[var(--surface-2)] w-2/3" />
                      <div className="h-3 rounded bg-[var(--surface-2)] w-3/4" />
                    </div>
                  </div>
                ))
              : results.slice().sort((a, b) => ORDER(a.model) - ORDER(b.model)).map((r) => {
                  const label = r.label || MODEL_LABEL(r.model);
                  const copied = copiedKey === r.model;
                  return (
                    <div key={r.model} className="qa-card rounded-2xl overflow-hidden qa-rise flex flex-col">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-faint)]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${r.ok ? "bg-[#28c840] shadow-[0_0_8px_#28c840]" : "bg-[#ff5f57] shadow-[0_0_8px_#ff5f57]"}`} />
                          <span className="text-xs font-semibold text-[var(--text-2)] qa-mono">{label}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(r.model, r.text)}
                          className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[#34d399] transition-colors"
                        >
                          {copied ? (
                            <>
                              <Check size={14} /> Скопировано
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Копировать
                            </>
                          )}
                        </button>
                      </div>
                      <div className={`qa-mono p-5 sm:p-6 whitespace-pre-wrap text-sm leading-relaxed min-h-[140px] ${r.ok ? "text-[var(--text-2)]" : "text-[var(--error)]"}`}>
                        {r.ok ? r.text : `❌ Ошибка: ${r.text}`}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Подвал с автором */}
        <footer className="mt-16 text-center qa-rise">
          <a
            href="https://t.me/Alexey_Saraev"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] hover:text-[#34d399] hover:border-[#34d399]/40 transition-all"
          >
            <Send size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            Created by Alexey Saraev
          </a>
        </footer>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── Тёмная тема (по умолчанию) ── */
        .qa-root {
          --bg: #07090a;
          --text: #e8edec;
          --text-2: #c7d0ce;
          --muted: #8a9794;
          --faint: #5f6b69;
          --error: #f7a8a8;
          --card-bg: rgba(255,255,255,0.035);
          --card-border: rgba(255,255,255,0.09);
          --border: rgba(255,255,255,0.10);
          --border-strong: rgba(255,255,255,0.20);
          --surface: rgba(255,255,255,0.03);
          --surface-2: rgba(255,255,255,0.06);
          --surface-3: rgba(255,255,255,0.12);
          --surface-faint: rgba(255,255,255,0.02);
          --grid: rgba(255,255,255,0.022);
          --glow1: rgba(52,211,153,0.16);
          --glow2: rgba(45,212,191,0.13);
          --card-shadow: 0 24px 60px -30px rgba(0,0,0,0.7);
          --card-inset: inset 0 1px 0 rgba(255,255,255,0.04);
          --title-grad: linear-gradient(135deg, #ffffff, #d9fbef, #7fe9c9);

          font-family: 'Hanken Grotesk', system-ui, sans-serif;
          color: var(--text);
          background: var(--bg);
          -webkit-font-smoothing: antialiased;
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* ── Светлая тема ── */
        .qa-root.qa-light {
          --bg: #eef3f1;
          --text: #0e1a18;
          --text-2: #2f3d3a;
          --muted: #5d6b68;
          --faint: #93a09c;
          --error: #b91c1c;
          --card-bg: rgba(255,255,255,0.72);
          --card-border: rgba(2,20,16,0.08);
          --border: rgba(2,20,16,0.10);
          --border-strong: rgba(2,20,16,0.18);
          --surface: rgba(2,20,16,0.035);
          --surface-2: rgba(2,20,16,0.06);
          --surface-3: rgba(2,20,16,0.10);
          --surface-faint: rgba(2,20,16,0.02);
          --grid: rgba(2,20,16,0.05);
          --glow1: rgba(52,211,153,0.22);
          --glow2: rgba(45,212,191,0.18);
          --card-shadow: 0 24px 60px -34px rgba(2,30,24,0.22);
          --card-inset: inset 0 1px 0 rgba(255,255,255,0.6);
          --title-grad: linear-gradient(135deg, #0f766e, #0d9488, #059669);
        }

        .qa-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .qa-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .qa-title {
          background-image: var(--title-grad);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
        }

        .qa-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(62% 48% at 18% -4%, var(--glow1), transparent 70%),
            radial-gradient(54% 50% at 96% 104%, var(--glow2), transparent 70%),
            var(--bg);
          transition: background 0.3s ease;
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
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        @keyframes qa-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        .qa-rise { animation: qa-rise 0.7s cubic-bezier(0.2,0.7,0.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .qa-rise { animation: none; } }
      `}</style>
    </div>
  );
}
