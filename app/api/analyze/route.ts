import { NextResponse } from 'next/server';

// На Vercel: запускаем в Node.js-рантайме и поднимаем лимит времени выполнения,
// чтобы большие генерации (например, Postman-коллекции) успевали завершиться.
export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL_LABELS: Record<string, string> = {
  gemini: "✨ Gemini",
  groq: "⚡ Groq",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, taskType } = body;

    // Поддерживаем и новое поле models (массив), и старое model (строка) — обратная совместимость
    let models: string[] = Array.isArray(body.models)
      ? body.models
      : body.model
      ? [body.model]
      : [];
    // без пустых и дублей (Array.from вместо спреда Set — работает при любом target)
    models = Array.from(new Set(models.filter(Boolean)));

    if (!prompt || !taskType || models.length === 0) {
      return NextResponse.json({ error: "Отсутствуют параметры" }, { status: 400 });
    }

    const systemPrompt =
      typeof body.systemPrompt === "string" && body.systemPrompt.trim()
        ? body.systemPrompt
        : getSystemPrompt(taskType);

    // Запускаем выбранные модели параллельно. Падение одной не ломает остальные.
    const results = await Promise.all(
      models.map(async (model) => {
        try {
          const text = await askModel(model, systemPrompt, prompt);
          return { model, ok: true, text };
        } catch (e: any) {
          return { model, ok: false, text: e?.message || "Неизвестная ошибка" };
        }
      })
    );

    // Возвращаем результат каждой модели отдельным объектом — фронт покажет их в разных блоках
    const payload = results.map((r) => ({
      model: r.model,
      label: MODEL_LABELS[r.model] || r.model,
      ok: r.ok,
      text: r.text,
    }));

    return NextResponse.json({ results: payload });
  } catch (error: any) {
    let errorMsg = error?.message || "Внутренняя ошибка";
    if (error?.cause) {
      try { errorMsg += ` (Причина: ${JSON.stringify(error.cause)})`; } catch {}
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Диспетчер моделей
async function askModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  switch (model) {
    case 'gemini': return askGemini(systemPrompt, userPrompt);
    case 'groq': return askGroq(systemPrompt, userPrompt);
    default: throw new Error(`Неизвестная модель: ${model}`);
  }
}

function getSystemPrompt(type: string): string {
  switch (type) {
    case 'requirements':
      return `Ты — Senior QA Engineer. Проанализируй требования. Найди противоречия, неоднозначности, пропущенные краевые случаи. Дай рекомендации. Форматируй ответ красиво.`;
    case 'testcases':
      return `Ты — Эксперт по тест-дизайну. Сгенерируй тест-кейсы. Формат: ID, Название, Тип (Позитивный/Негативный/Краевой), Предусловия, Шаги, Ожидаемый результат.`;
    case 'code':
      return `Ты — QA Automation Engineer & Security Expert. Проанализируй код: найди баги, уязвимости, проблемы производительности. Предложи рефакторинг.`;
    default: return "Ты помощник QA.";
  }
}

// --- GEMINI ---
async function askGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Ключ GEMINI_API_KEY не найден.");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }] })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({} as any));
    throw new Error(`Gemini: ${e?.error?.message || res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Пустой ответ от Gemini";
}

// --- GROQ ---
async function askGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Ключ GROQ_API_KEY не найден.");

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({} as any));
    throw new Error(`Groq: ${e?.error?.message || res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Пустой ответ от Groq";
}
