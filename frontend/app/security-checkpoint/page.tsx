//app/security-checkpoint

'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CheckpointRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ดึงค่าที่ส่งมาจากหน้า Login หรือ Google SSO
    const userId = searchParams.get('userId');
    const method = searchParams.get('method') || 'email';

    // 🎲 สุ่ม Path ของ Captcha ทั้ง 4 แบบ (ให้ตรงกับชื่อโฟลเดอร์ที่คุณมี)
    const routes = ['text', 'math', 'slider', 'cloudflare'];
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];

    console.log(`🔀 Redirecting to /captcha/${randomRoute}`);

    // สั่ง Redirect ไปที่หน้า Captcha นั้นๆ พร้อมพก userId และ method ไปด้วย
    router.replace(`/captcha/${randomRoute}?userId=${userId}&method=${method}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Preparing Security Challenge...</p>
      </div>
    </div>
  );
}

export default function SecurityCheckpointPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckpointRedirector />
    </Suspense>
  );
}