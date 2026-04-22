import { NextResponse } from 'next/server';
import { loginSchema } from '../../../../lib/auth/schemas';
import { proxyAuthRequest } from '../../../../lib/auth/proxy';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  return proxyAuthRequest('/auth/login', parsed.data);
}
