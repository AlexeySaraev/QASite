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
      case 'llama': resultText = await askLlama(systemPrompt, prompt); break;
      default: return NextResponse.json({ error: "Неизвестная модель" }, { status: 400 });
    }

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
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

// --- LLAMA 3.1 (Через OpenRouter) ---
async function askLlama(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Добавьте ключ OPENROUTER_API_KEY в Netlify.");

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      // Передаем название вашего сайта для статистики OpenRouter (обязательно для бесплатных ключей)
      'HTTP-Referer': 'https://qasav.netlify.app', 
      'X-Title': 'QA AI Assistant'
    },
    body: JSON.stringify({ 
      // Используем бесплатную версию Llama 3.1 8B
      model: 'google/gemma-2-9b-it:free', 
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] 
    })
  });
  
  if (!res.ok) { 
    const e = await res.json(); 
    throw new Error(`Llama (OpenRouter): ${e?.error?.message || res.status}`); 
  }
  
  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от Llama";
}
