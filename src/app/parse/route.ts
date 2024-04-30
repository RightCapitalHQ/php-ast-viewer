import { CliHelpers } from '@rightcapital/php-parser';

export const dynamic = 'force-dynamic';

// only for local development, the production environment will use /api/parse.php
export async function POST(request: Request) {
  const { code: phpCode } = await request.json();

  const data = await CliHelpers.parsePhpCodeStringToAst(phpCode);

  return Response.json({
    result: JSON.stringify(data),
  });
}
