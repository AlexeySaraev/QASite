import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, taskType, model } = await req.json();
    if (!prompt || !taskType || !model) {
      return NextResponse.json({ error: "Отсутствуют параметры" }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(taskType);
    let resultText = "";

    switch (model) {
      case 'gemini': resultText = await askGemini(systemPrompt, prompt); break;
      case 'gigachat': resultText = await askGigaChat(systemPrompt, prompt); break;
      case 'grok': resultText = await askGrok(systemPrompt, prompt); break;
      default: return NextResponse.json({ error: "Неизвестная модель" }, { status: 400 });
    }

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    // Выводим максимально подробную ошибку
    let errorMsg = error.message || "Внутренняя ошибка";
    if (error.cause) errorMsg += ` (Причина: ${JSON.stringify(error.cause)})`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }] })
  });
  if (!res.ok) { 
    const e = await res.json(); 
    throw new Error(`Gemini: ${e?.error?.message || res.status}`); 
  }
  const data = await res.json();
  return data?.candidates[0]?.content?.parts[0]?.text || "Пустой ответ от Gemini";
}

// --- GIGACHAT (Улучшено) ---
async function askGigaChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const authKey = process.env.GIGACHAT_API_KEY;
  if (!authKey) throw new Error("Добавьте ключ GIGACHAT_API_KEY в Netlify.");

  // Генерируем UUID надежным способом (без crypto.randomUUID, чтобы избежать ошибок Netlify)
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
    // Если fetch падает на этапе соединения (fetch failed)
    throw new Error(`GigaChat: Не удалось подключиться к серверу Сбера. ${fetchError.message}. Проверьте, нет ли пробелов в ключе.`);
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

// --- GROK (Исправлено: новая модель) ---
async function askGrok(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("Ключ GROK_API_KEY не найден.");

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ 
      model: 'grok-2-mini', // Заменили grok-beta на актуальную grok-2-mini
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] 
    })
  });
  if (!res.ok) { 
    const e = await res.json(); 
    throw new Error(`Grok: ${e?.error?.message || res.status}`); 
  }
  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от Grok";
}
