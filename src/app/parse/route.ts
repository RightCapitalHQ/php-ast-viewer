import { NextRequest, NextResponse } from 'next/server';
import { ParserFactory, PhpVersion } from '@rightcapital/php-parser';

const parserFactory = new ParserFactory();
const parser = parserFactory.createForVersion(PhpVersion.fromString('8.4'));

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const stmts = parser.parse(code);
    const result = JSON.stringify(stmts, null, 2);

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Parse Error: ${error.message}` },
      { status: 400 },
    );
  }
}
