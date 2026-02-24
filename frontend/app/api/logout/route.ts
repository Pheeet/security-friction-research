//app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // 1. เข้าถึง Cookies
  const cookieStore = await cookies();

  // 2. สั่งลบ Cookie "auth_token" ซึ่งเป็นตัวหลักของระบบใหม่
  cookieStore.delete('auth_token');

  // 3. สั่งลบ Cookie ตัวเก่าๆ ทิ้งให้เกลี้ยง (Clean up)
  cookieStore.delete('is-logged-in');
  cookieStore.delete('research_session_id'); 
  cookieStore.delete('session'); 

  // 4. ส่ง Response กลับไปบอก Frontend ว่า "เคลียร์สิทธิ์เสร็จแล้วจ้า"
  return NextResponse.json({ success: true });
}

