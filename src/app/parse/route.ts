export const dynamic = 'force-dynamic';

// This route is ONLY for local development.
// In production, Vercel routes /parse to /api/parse.php via vercel.json
// The actual implementation is loaded dynamically to avoid bundling php-parser
export async function POST(request: Request) {
  // In production (Vercel), this route won't be called due to vercel.json routing
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return new Response('Use /api/parse.php in production', { status: 404 });
  }

  // Only load in development - use eval to completely prevent static analysis
  try {
    const module = await eval(`import('@rightcapital/php-parser')`);
    const { CliHelpers } = module;
    const { code: phpCode } = await request.json();

    const data = CliHelpers.parsePhpCodeStringToAst(phpCode);

    return Response.json({
      result: JSON.stringify(data),
    });
  } catch {
    return new Response('php-parser not available', { status: 500 });
  }
}
