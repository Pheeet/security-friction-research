//app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // 1. เข้าถึง Cookies
  const cookieStore = await cookies();

  const cookiesToClear = [
    'auth_token',
    'experiment_mode',
    'research_session_id',
    'sso_start_time',
    'is-logged-in',
    'session'
  ];

  cookiesToClear.forEach(cookieName => {
    cookieStore.delete(cookieName);
  });

  return NextResponse.json({ 
    success: true,
    message: "All sessions and cookies cleared" 
  });
}

