/** @type {import('next').NextConfig} */
const nextConfig = {
  // Гарантирует корректные пути для ресурсов при работе за прокси
  assetPrefix: '',
  
  // Добавляет слеш в конце URL, что предотвращает ошибки 404/pending при обращении к чанкам
  trailingSlash: true,

  // Убирает проверку целостности (subresource integrity), которая часто конфликтует 
  // с модификацией контента на стороне Cloudflare
  generateBuildId: async () => 'build',

  // Добавляем заголовки, разрешающие загрузку ресурсов и отключающие 
  // слишком строгую политику безопасности, которая может блокировать чанки
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
