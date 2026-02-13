import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // 1. เข้าถึง Cookies
  const cookieStore = await cookies();

  // 2. สั่งลบ Cookie ทุกตัวที่เกี่ยวข้อง
  // (ต้องลบให้เกลี้ยง ไม่งั้น Middleware จะนึกว่ายัง Login อยู่)
  cookieStore.delete('is-logged-in');
  cookieStore.delete('research_session_id'); // ลบ Session ของ Backend ด้วย
  cookieStore.delete('session'); // เผื่อไว้ถ้ามีชื่อนี้

  // 3. ส่ง Response กลับไปบอกว่า "ลบเสร็จแล้วจ้า"
  return NextResponse.json({ success: true });
}