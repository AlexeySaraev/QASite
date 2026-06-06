"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [model, setModel] = useState("gemini");
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult("⏳ ИИ обрабатывает запрос...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, taskType, model }),
      });

      const data = await res.json();

      if (data.error) {
        setResult(`❌ Ошибка: ${data.error}`);
      } else {
        setResult(data.result);
      }
    } catch {
      setResult("❌ Произошла ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      
      {/* Заголовок */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-transparent bg-clip-text">
          QA AI Assistant
        </h1>
        <p className="text-lg text-slate-500">
          Инструмент для анализа требований и генерации тест-кейсов
        </p>
      </div>

      {/* Блок настроек */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
        
        <div className="grid md:grid-cols-2 gap-10">
          
          {/* Модель */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
              Нейросеть
            </h3>
            <div className="flex gap-3">
              {["gemini", "groq"].map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                    model === m
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {m === "gemini" ? "✨ Gemini" : "⚡ Groq"}
                </button>
              ))}
            </div>
          </div>

          {/* Тип задачи */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
              Тип задачи
            </h3>
            <div className="flex gap-3">
              {[
                { id: "requirements", label: "📋 Анализ" },
                { id: "testcases", label: "🧪 Тест-кейсы" },
                { id: "code", label: "💻 Код" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTaskType(tab.id)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                    taskType === tab.id
                      ? "bg-violet-600 text-white border-violet-600 shadow-md"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
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
      <div className="relative mb-8">
        <textarea
          placeholder="Вставьте требования или код..."
          className="w-full h-56 p-5 pr-14 bg-white border border-slate-200 rounded-3xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {input && (
          <button
            onClick={() => setInput("")}
            className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Кнопка запуска */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !input.trim()}
        className="w-full py-4 rounded-3xl text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-xl transition-all disabled:opacity-60"
      >
        {loading ? "Анализирую..." : "🚀 Запустить анализ"}
      </button>

      {/* Результат */}
      {result && (
        <div className="mt-10 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 whitespace-pre-wrap text-sm leading-relaxed">
          {result}
        </div>
      )}
    </main>
  );
}
