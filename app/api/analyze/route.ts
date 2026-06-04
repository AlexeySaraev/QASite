import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, taskType, model } = await req.json();

    if (!prompt || !taskType || !model) {
      return NextResponse.json(
        { error: "Отсутствуют параметры (prompt, taskType, model)" },
        { status: 400 }
      );
    }

    const systemPrompt = getSystemPrompt(taskType);
    let resultText = "";

    if (model === "gemini") {
      resultText = await askGemini(systemPrompt, prompt);
    } else if (model === "groq") {
      resultText = await askGroq(systemPrompt, prompt);
    } else if (model === "cerebras") {
      resultText = await askCerebras(systemPrompt, prompt);
    } else {
      return NextResponse.json(
        { error: `Неизвестная модель: ${model}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    console.error("API /api/analyze error:", error);
    return NextResponse.json(
      { error: error.message || "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

function getSystemPrompt(type: string): string {
  switch (type) {
    case "requirements":
      return `Ты — Senior QA Engineer. Проанализируй требования и:

1) Найди противоречия и неоднозначности
2) Выяви недостающие сценарии и условия
3) Укажи риски и предположения
4) Предложи улучшения формулировок

Структурируй ответ по разделам.`;
    case "testcases":
      return `Ты — опытный инженер по тестированию. На основе описания функционала:

1) Сгенерируй позитивные сценарии (happy path)
2) Добавь негативные сценарии
3) Пропиши граничные значения и edge-cases
4) Для каждого тест-кейса укажи: Название, Предусловия, Шаги, Ожидаемый результат.

Структурируй ответ списком тест-кейсов.`;
    case "code":
      return `Ты — QA Automation Engineer и Code Reviewer. Проанализируй код:

1) Найди возможные баги и уязвимости
2) Укажи проблемные места по производительности
3) Предложи тест-кейсы для проверки этой функции/модуля
4) При необходимости предложи рефакторинг.

Структурируй ответ по пунктам.`;
    default:
      return "Ты помощник QA.";
  }
}

// ---------- GEMINI ----------
async function askGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Ключ GEMINI_API_KEY не найден в окружении Render.");

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    let msg = `Gemini HTTP ${res.status}`;
    try {
      const e = await res.json();
      msg = `Gemini: ${e?.error?.message || msg}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ от Gemini"
  );
}

// ---------- GROQ (Llama 3.3) ----------
async function askGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Ключ GROQ_API_KEY не найден в окружении Render.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    let msg = `Groq HTTP ${res.status}`;
    try {
      const e = await res.json();
      msg = `Groq: ${e?.error?.message || msg}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Пустой ответ от Groq";
}

// ---------- CEREBRAS ----------
async function askCerebras(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("Ключ CEREBRAS_API_KEY не найден в окружении Render.");

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-instruct", // актуальная модель от Cerebras на базе Llama 3.3
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    let msg = `Cerebras HTTP ${res.status}`;
    try {
      const e = await res.json();
      msg = `Cerebras: ${e?.error?.message || msg}`;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Пустой ответ от Cerebras";
}
