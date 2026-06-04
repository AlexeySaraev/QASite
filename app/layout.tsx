export const metadata = {
  title: 'QA AI Assistant',
  description: 'Анализ требований, тест-кейсы и ревью кода',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 min-h-screen">{children}</body>
    </html>
  )
}
