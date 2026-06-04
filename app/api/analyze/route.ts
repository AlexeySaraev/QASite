import { useState } from "react";

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
    } catch (error) {
      setResult("❌ Произошла ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
      <div className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-transparent bg-clip-text">
          QA AI Assistant
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Ваш персональный ИИ-помощник для обеспечения качества.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Нейросеть</label>
            <div className="flex gap-2">
              {["gemini", "groq", "deepseek"].map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                    model === m 
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m === "gemini" ? "✨ Gemini" : m === "groq" ? "⚡ Groq" : "🚀 Cerebras"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Тип задачи</label>
            <div className="flex gap-2">
              {[
                { id: "requirements", label: "📋 Анализ" },
                { id: "testcases", label: "🧪 Тест-кейсы" },
                { id: "code", label: "💻 Код" },
              ].map((tab) => (
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <textarea
          placeholder="Вставьте требования или код..."
          className="w-full h-52 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-y text-sm text-slate-800 placeholder:text-slate-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !input.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/25 text-lg"
      >
        {loading ? "Анализирую..." : "🚀 Запустить анализ"}
      </button>

      {result && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[150px] whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
          {result}
        </div>
      )}
    </main>
  );
}
