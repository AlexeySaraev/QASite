"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2, Sparkles, Zap, Send, AlertTriangle } from "lucide-react";

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

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]); // [{ model, label, ok, text }]
  const [error, setError] = useState("");
  const [models, setModels] = useState(["gemini"]); // мультивыбор, по умолчанию одна
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

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
        body: JSON.stringify({ prompt: input, taskType, models, model: models[0] }),
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
    "text-[#8a9794] bg-white/[0.03] border-white/10 hover:text-[#e8edec] hover:bg-white/[0.06] hover:border-white/20";

  // несколько блоков выводим в 2 колонки на широких экранах — удобно сравнивать
  const multi = results.length > 1 || (loading && models.length > 1);

  return (
    <div className="qa-root min-h-screen w-full">
      <div className="qa-bg" />
      <div className="qa-grid" />

      <main className="relative max-w-3xl mx-auto px-5 py-16 sm:py-24">

        {/* Хедер */}
        <header className="text-center mb-12 qa-rise">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-[#9fb0ad] backdrop-blur-sm">
            <Sparkles size={13} className="text-[#34d399]" />
            Анализ · Кейсы · Код
          </span>
          <h1 className="qa-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5">
            <span className="bg-gradient-to-br from-white via-[#d9fbef] to-[#7fe9c9] text-transparent bg-clip-text">
              QA AI Assistant
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#8a9794] max-w-xl mx-auto leading-relaxed">
            AI-ассистент для обеспечения качества
          </p>
        </header>

        {/* Панель выбора */}
        <section className="qa-card rounded-2xl p-6 sm:p-7 mb-5 qa-rise" style={{ animationDelay: "0.08s" }}>
          <div className="grid sm:grid-cols-2">
            <div className="sm:pr-7">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[#9fb0ad] mb-3.5 uppercase tracking-[0.14em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
                Нейросеть
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

            <div className="sm:pl-7 sm:border-l border-white/10 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[#9fb0ad] mb-3.5 uppercase tracking-[0.14em]">
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

        {/* Поле ввода */}
        <section className="qa-card rounded-2xl p-2 mb-5 qa-rise" style={{ animationDelay: "0.16s" }}>
          <div className="relative">
            <textarea
              placeholder="Вставьте требования или код…"
              className="qa-mono w-full h-56 p-4 pr-12 bg-transparent rounded-xl focus:outline-none resize-y text-sm text-[#e8edec] placeholder:text-[#5f6b69] leading-relaxed"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {input && (
              <button
                onClick={handleClear}
                title="Очистить"
                aria-label="Очистить поле"
                className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] text-[#8a9794] hover:bg-white/[0.12] hover:text-white transition-all"
              >
                <X size={15} />
              </button>
            )}
            <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] text-[#5f6b69] select-none pointer-events-none qa-mono">
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

        {/* Общая ошибка (например, нет параметров) */}
        {error && (
          <div className="mt-7 qa-card rounded-2xl p-5 flex items-start gap-3 text-sm text-[#f7a8a8] qa-rise">
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
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                      <span className="text-xs font-semibold text-[#8a9794] qa-mono">{MODEL_LABEL(id)}</span>
                      <Loader2 size={14} className="animate-spin text-[#34d399]" />
                    </div>
                    <div className="p-5 sm:p-6 space-y-3 animate-pulse">
                      <div className="h-3 rounded bg-white/[0.06] w-5/6" />
                      <div className="h-3 rounded bg-white/[0.06] w-full" />
                      <div className="h-3 rounded bg-white/[0.06] w-2/3" />
                      <div className="h-3 rounded bg-white/[0.06] w-3/4" />
                    </div>
                  </div>
                ))
              : results.slice().sort((a, b) => ORDER(a.model) - ORDER(b.model)).map((r) => {
                  const label = r.label || MODEL_LABEL(r.model);
                  const copied = copiedKey === r.model;
                  return (
                    <div key={r.model} className="qa-card rounded-2xl overflow-hidden qa-rise flex flex-col">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${r.ok ? "bg-[#28c840] shadow-[0_0_8px_#28c840]" : "bg-[#ff5f57] shadow-[0_0_8px_#ff5f57]"}`} />
                          <span className="text-xs font-semibold text-[#c7d0ce] qa-mono">{label}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(r.model, r.text)}
                          className="flex items-center gap-1.5 text-xs font-medium text-[#8a9794] hover:text-[#34d399] transition-colors"
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
                      <div className={`qa-mono p-5 sm:p-6 whitespace-pre-wrap text-sm leading-relaxed min-h-[140px] ${r.ok ? "text-[#d7dedc]" : "text-[#f7a8a8]"}`}>
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
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-[#8a9794] hover:text-[#34d399] hover:border-[#34d399]/40 transition-all"
          >
            <Send size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            Created by Alexey Saraev
          </a>
        </footer>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .qa-root {
          font-family: 'Hanken Grotesk', system-ui, sans-serif;
          color: #e8edec;
          background: #07090a;
          -webkit-font-smoothing: antialiased;
        }
        .qa-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .qa-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        .qa-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(62% 48% at 18% -4%, rgba(52,211,153,0.16), transparent 70%),
            radial-gradient(54% 50% at 96% 104%, rgba(45,212,191,0.13), transparent 70%),
            #07090a;
        }
        .qa-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
                  mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 30%, transparent 76%);
        }

        .qa-card {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 24px 60px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04);
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
