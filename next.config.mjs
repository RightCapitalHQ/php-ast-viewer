/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Rewrite /parse to local PHP server in development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/parse',
          destination: 'http://localhost:8080/api/parse.php',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
