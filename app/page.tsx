"use client";

import { useState, useEffect } from "react";
import { X, Sun, Moon } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<{ model: string; result: string }[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini"]);
  const [taskType, setTaskType] = useState("requirements");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // ========================
  // Theme toggle
  // ========================
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // ========================
  // Model selection
  // ========================
  const toggleModel = (model: string) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter((m) => m !== model));
    } else {
      if (selectedModels.length < 2) {
        setSelectedModels([...selectedModels, model]);
      }
    }
  };

  // ========================
  // Analyze
  // ========================
  const handleAnalyze = async () => {
    if (!input.trim() || selectedModels.length === 0) return;

    setLoading(true);
    setResults([]);

    try {
      const responses = await Promise.all(
        selectedModels.map(async (model) => {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: input, taskType, model }),
          });

          const data = await res.json();

          return {
            model,
            result: data.error ? `❌ ${data.error}` : data.result,
          };
        })
      );

      setResults(responses);
    } catch {
      setResults([{ model: "error", result: "Ошибка сети." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 dark:bg-slate-900 min-h-screen transition-colors">

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          QA AI Assistant
        </h1>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 dark:text-white"
        >
          {darkMode ? "☀ Светлая" : "🌙 Тёмная"}
        </button>
      </div>

      {/* Models */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow p-6 mb-8 border dark:border-slate-700">
        <h3 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-300 uppercase">
          Выберите до 2 моделей
        </h3>

        <div className="flex gap-4">
          {["gemini", "groq"].map((m) => (
            <button
              key={m}
              onClick={() => toggleModel(m)}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                selectedModels.includes(m)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 dark:text-white"
              }`}
            >
              {m === "gemini" ? "✨ Gemini" : "⚡ Groq"}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Введите текст..."
        className="w-full h-56 p-5 rounded-3xl border bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 mb-8 resize-y"
      />

      {/* Run */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-4 rounded-3xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold shadow-xl mb-10"
      >
        {loading ? "Анализ..." : "🚀 Запустить"}
      </button>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {results.map((r, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 border dark:border-slate-700 whitespace-pre-wrap text-sm"
          >
            <h4 className="font-bold mb-3">
              {r.model === "gemini" ? "✨ Gemini" : "⚡ Groq"}
            </h4>
            {r.result}
          </div>
        ))}
      </div>
    </main>
  );
}
