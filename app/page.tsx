"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("Здесь появится результат...");
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
    } catch (error) {
      setResult("❌ Произошла ошибка сети. Проверьте ключи API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          QA AI Assistant
        </h1>
        <p className="text-lg text-slate-500">
          Анализ требований • Генерация тест-кейсов • Ревью кода
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gemini">Gemini (Google)</option>
          <option value="gigachat">GigaChat (Сбер)</option>
          <option value="grok">Grok (xAI)</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
        {[
          { id: "requirements", label: "Анализ требований" },
          { id: "testcases", label: "Генерация тест-кейсов" },
          { id: "code", label: "Анализ кода" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTaskType(tab.id)}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
              taskType === tab.id 
                ? "bg-blue-600 text-white shadow" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Вставьте сюда требования, пользовательскую историю или код..."
        className="w-full h-48 p-4 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-y text-sm"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow mb-6"
      >
        {loading ? "Анализирую..." : "🚀 Запустить анализ"}
      </button>

      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm min-h-[200px] whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
        {result}
      </div>
    </main>
  );
}
