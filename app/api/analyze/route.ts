import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, taskType, model } = await req.json();
    const systemPrompt = getSystemPrompt(taskType);
    let resultText = "";

    if (model === 'gemini') {
      resultText = await askGemini(systemPrompt, prompt);
    } else if (model === 'gigachat') {
      resultText = await askGigaChat(systemPrompt, prompt);
    } else if (model === 'grok') {
      resultText = await askGrok(systemPrompt, prompt);
    }

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

function getSystemPrompt(type: string) {
  switch (type) {
    case 'requirements':
      return "Ты — Senior QA Engineer. Проанализируй следующие требования. Найди противоречия, неоднозначности, пропущенные краевые случаи, неявные допущения. Дай рекомендации по улучшению. Ответ отформатируй красиво, используя списки и заголовки.";
    case 'testcases':
      return "Ты — Senior QA Engineer. На основе предоставленных данных сгенерируй подробные тест-кейсы. Используй формат: 1. Название 2. Предусловия 3. Шаги 4. Ожидаемый результат. Обязательно включи позитивные, негативные сценарии и краевые случаи.";
    case 'code':
      return "Ты — QA Automation Engineer & Security Expert. Проанализируй этот код. Найди баги, уязвимости, проблемы с производительностью. Предложи улучшения и напиши исправленный вариант кода, если это необходимо.";
    default:
      return "Ты — помощник QA.";
  }
}

async function askGemini(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Ключ GEMINI_API_KEY не добавлен в настройки Vercel");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\nДанные пользователя:\n${userPrompt}` }] }]
    })
  });
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function askGigaChat(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.GIGACHAT_API_KEY;
  if (!apiKey) throw new Error("Ключ GIGACHAT_API_KEY не добавлен в настройки Vercel");

  const res = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'GigaChat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function askGrok(systemPrompt: string, userPrompt: string) {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("Ключ GROK_API_KEY не добавлен в настройки Vercel");

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const data = await res.json();
  return data.choices[0].message.content;
}
