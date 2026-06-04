import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { model } = await req.json();
    
    // Проверяем, видит ли сайт ключи из Netlify
    const keys: any = {
      gemini: process.env.GEMINI_API_KEY,
      gigachat: process.env.GIGACHAT_API_KEY,
      grok: process.env.GROK_API_KEY
    };

    const currentKey = keys[model];

    if (!currentKey) {
      return NextResponse.json({ 
        result: `❌ ДИАГНОСТИКА: Ключ для модели "${model}" НЕ НАЙДЕН на сервере!\n\nВозможные причины:\n1. В Netlify переменная называется не ${model.toUpperCase()}_API_KEY\n2. В значении ключа стоят кавычки\n3. Вы не нажали "Trigger deploy" после добавления ключа.` 
      });
    }

    return NextResponse.json({ 
      result: `✅ ДИАГНОСТИКА: Ключ для модели "${model}" НАЙДЕН!\nПервые 5 символов ключа: ${currentKey.substring(0, 5)}...\n\nЗначит связь с Netlify работает отлично. Ошибка была в самих нейросетях.` 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
