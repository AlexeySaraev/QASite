/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: '',
  trailingSlash: true,
  generateBuildId: async () => 'build',
};
export default nextConfig;
