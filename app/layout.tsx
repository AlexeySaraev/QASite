import './globals.css'

export const metadata = {
  title: 'QA AI Assistant',
  description: 'Анализ требований, генерация тест-кейсов и ревью кода с помощью ИИ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
