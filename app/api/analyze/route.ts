import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, taskType, model } = await req.json();
    
    if (!prompt || !taskType || !model) {
      return NextResponse.json({ error: "Отсутствуют обязательные параметры" }, { status: 400 });
    }

    const systemPrompt = getSystemPrompt(taskType);
    let resultText = "";

    switch (model) {
      case 'gemini':
        resultText = await askGemini(systemPrompt, prompt);
        break;
      case 'gigachat':
        resultText = await askGigaChat(systemPrompt, prompt);
        break;
      case 'grok':
        resultText = await askGrok(systemPrompt, prompt);
        break;
      default:
        return NextResponse.json({ error: "Неизвестная модель" }, { status: 400 });
    }

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

function getSystemPrompt(type: string): string {
  switch (type) {
    case 'requirements':
      return `Ты — Senior QA Engineer с 10-летним опытом. Твоя задача — глубоко проанализировать предоставленные требования.
Найди:
1. Противоречия и неточности.
2. Неоднозначные формулировки, которые разработчик или тестировщик может понять неправильно.
3. Пропущенные краевые случаи (edge cases).
4. Неявные допущения.
5. Отсутствие нефункциональных требований (производительность, безопасность, доступность).
Дай четкие рекомендации по улучшению. Отформатируй ответ с использованием заголовков и списков.`;
      
    case 'testcases':
      return `Ты — Эксперт по тест-дизайну. На основе предоставленных данных сгенерируй полные тест-кейсы.
Используй строгий формат для каждого кейса:
- **ID:** TC-[номер]
- **Название:** [Краткое описание]
- **Тип:** Позитивный / Негативный / Краевой случай
- **Предусловия:** [Что должно быть выполнено]
- **Шаги:** 1. ... 2. ...
- **Ожидаемый результат:** [Что должно произойти]

Обязательно покрой:
- Основной счастливый путь (Happy path)
- Альтернативные сценарии
- Граничные значения
- Обработку ошибок и отсутствие данных`;
      
    case 'code':
      return `Ты — Senior QA Automation Engineer и эксперт по безопасности (AppSec). Проанализируй предоставленный код.
Выполни:
1. **Code Review:** Найди потенциальные баги, плохие практики, нарушения принципов SOLID/DRY/KISS.
2. **Security Check:** Проверь на уязвимости (OWASP Top 10, инъекции, утечки данных, небезопасные зависимости).
3. **Performance:** Укажи узкие места, влияющие на скорость работы.
4. **Testability:** Предложи, как улучшить тестируемость этого кода.
5. **Refactoring:** Предложи улучшенный вариант кода с комментариями, если это необходимо.`;
      
    default:
      return "Ты — помощник QA.";
  }
}

async function askGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Ключ GEMINI_API_KEY не добавлен в настройки окружения (Environment Variables).");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\nВходные данные:\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.4 }
    })
  });
  
  if (!res.ok) throw new Error(`Gemini API вернул ошибку: ${res.status}`);
  const data = await res.json();
  return data?.candidates[0]?.content?.parts[0]?.text || "Пустой ответ от Gemini";
}

async function askGigaChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GIGACHAT_API_KEY;
  if (!apiKey) throw new Error("Ключ GIGACHAT_API_KEY не добавлен в настройки окружения (Environment Variables).");

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
      ],
      temperature: 0.4
    })
  });

  if (!res.ok) throw new Error(`GigaChat API вернул ошибку: ${res.status}`);
  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от GigaChat";
}

async function askGrok(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("Ключ GROK_API_KEY не добавлен в настройки окружения (Environment Variables).");

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
      ],
      temperature: 0.4
    })
  });

  if (!res.ok) throw new Error(`Grok API вернул ошибку: ${res.status}`);
  const data = await res.json();
  return data?.choices[0]?.message?.content || "Пустой ответ от Grok";
}
