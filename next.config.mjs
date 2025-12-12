/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Exclude php-parser and its heavy deps from serverless bundle (only used in local dev, production uses PHP)
  serverExternalPackages: ['@rightcapital/php-parser', 'typescript', 'prettier'],
  // Disable TypeScript and ESLint during build to reduce bundle size
  typescript: {
    // TypeScript errors are checked in CI, skip during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint errors are checked in CI, skip during build
    ignoreDuringBuilds: true,
  },
  // Exclude heavy packages from output file tracing
  outputFileTracingExcludes: {
    '*': [
      'node_modules/typescript/**',
      'node_modules/@rightcapital/php-parser/**',
      'node_modules/prettier/**',
    ],
  },
};

export default nextConfig;
