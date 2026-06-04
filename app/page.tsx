"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [model, setModel] = useState("gemini");
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, taskType, model }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        setResult(`❌ Ошибка: ${data.error}\n\nУбедитесь, что вы добавили ключ API для выбранной модели в настройки Netlify.`);
      } else {
        setResult(data.result);
      }
    } catch (error) {
      setResult("❌ Произошла ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
      setCopied(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "requirements", label: "📋 Анализ требований", desc: "Найдет дыры и противоречия" },
    { id: "testcases", label: "🧪 Тест-кейсы", desc: "Позитивные, негативные, краевые" },
    { id: "code", label: "💻 Анализ кода", desc: "Баги, уязвимости, рефакторинг" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
      {/* Заголовок */}
      <div className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-transparent bg-clip-text">
          QA AI Assistant
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Ваш персональный ИИ-помощник для обеспечения качества. Выберите модель, задачу и получите результат за секунды.
        </p>
      </div>

      {/* Настройки (Модель + Задача) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Выбор модели */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Нейросеть</label>
            <div className="flex gap-2">
              {["gemini", "grok"].map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                    model === m 
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                 {m === "gemini" ? "✨ Gemini" : "🚀 Grok"}
                </button>
              ))}
            </div>
          </div>

          {/* Выбор задачи */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Тип задачи</label>
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTaskType(tab.id)}
                  className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all border ${
                    taskType === tab.id 
                      ? "bg-violet-50 border-violet-500 text-violet-700 shadow-sm" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Поле ввода */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Входные данные</label>
        <textarea
          placeholder={
            taskType === "code" 
              ? "Вставьте код для анализа..." 
              : "Вставьте требования, пользовательскую историю или описание фичи..."
          }
          className="w-full h-52 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y text-sm text-slate-800 placeholder:text-slate-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      {/* Кнопка запуска */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !input.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:shadow-none text-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ИИ думает...
          </>
        ) : (
          "🚀 Запустить анализ"
        )}
      </button>

      {/* Результат */}
      {(result || loading) && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Результат</h3>
            {result && !loading && (
              <button 
                onClick={copyToClipboard}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors font-medium"
              >
                {copied ? "✅ Скопировано!" : "📋 Копировать"}
              </button>
            )}
          </div>
          <div className="p-6 min-h-[150px] whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Генерация ответа...
              </div>
            ) : (
              result
            )}
          </div>
        </div>
      )}
      
      <footer className="text-center text-xs text-slate-400 mt-12">
        Powered by Google Gemini, Sber GigaChat & xAI Grok
      </footer>
    </main>
  );
}
