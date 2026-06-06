import { NextResponse } from 'next/server';

const MODEL_LABELS: Record<string, string> = {
  gemini: "✨ Gemini",
  groq: "⚡ Groq",
  gigachat: "🟢 GigaChat",
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

    const systemPrompt = getSystemPrompt(taskType);

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
    let errorMsg = error.message || "Внутренняя ошибка";
    if (error.cause) errorMsg += ` (Причина: ${JSON.stringify(error.cause)})`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Диспетчер моделей
async function askModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  switch (model) {
    case 'gemini': return askGemini(systemPrompt, userPrompt);
    case 'groq': return askGroq(systemPrompt, userPrompt);
    case 'gigachat': return askGigaChat(systemPrompt, userPrompt);
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
  if (!res.ok) { const e = await res.json(); throw new Error(`Gemini: ${e?.error?.message || res.status}`); }
  const data = await res.json();
  return data?.candidates[0]?.content?.parts[0]?.text || "Пустой ответ от Gemini";
}

// --- GROQ ---
async function askGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Добавьте ключ GROQ_API_KEY в Render.");

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(`Groq: ${e?.error?.message || res.status}`); }
  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от Groq";
}

// --- GIGACHAT ---
async function askGigaChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const authKey = process.env.GIGACHAT_API_KEY;
  if (!authKey) throw new Error("Добавьте ключ GIGACHAT_API_KEY (Authorization key) в Render.");

  // Генерируем UUID (надежный способ без crypto.randomUUID)
  const rqUid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // 1. Получаем Access Token
  let tokenRes;
  try {
    tokenRes = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUid,
        'Authorization': `Basic ${authKey}`
      },
      body: 'scope=GIGACHAT_API_PERS'
    });
  } catch (fetchError: any) {
    throw new Error(`GigaChat: Не удалось подключиться к серверу Сбера. Серверы Render заблокированы Сбером. (${fetchError.message})`);
  }

  if (!tokenRes.ok) {
    let errText = `Статус: ${tokenRes.status}`;
    try { const e = await tokenRes.json(); errText = e.error_description || errText; } catch {}
    throw new Error(`GigaChat Auth Error: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 2. Запрашиваем ответ у нейросети
  const res = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      model: 'GigaChat',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    })
  });

  if (!res.ok) {
    const e = await res.json();
    throw new Error(`GigaChat: ${e?.error?.message || res.status}`);
  }

  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от GigaChat";
}
