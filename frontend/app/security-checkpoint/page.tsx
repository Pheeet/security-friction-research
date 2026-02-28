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

    // ใช้ Round-Robin แทน Random
    const routes = ['text', 'math', 'slider', 'cloudflare'];
    
    // แปลง userId เป็นตัวเลข (ฐาน 10)
    const numericUserId = parseInt(userId || '0', 10);
    
    // ใช้การหารเอาเศษ (Modulo) 
    // ถ้า userId = 1 -> ได้ 1 (math)
    // ถ้า userId = 2 -> ได้ 2 (slider)
    // ถ้า userId = 3 -> ได้ 3 (cloudflare)
    // ถ้า userId = 4 -> ได้ 0 (text)
    // ถ้าบังเอิญ userId แปลงเป็นเลขไม่ได้ (NaN) ให้ fallback กลับไปสุ่มเผื่อเหนียว
    const index = isNaN(numericUserId) ? Math.floor(Math.random() * routes.length) : (numericUserId % routes.length);
    const selectedRoute = routes[index];

    console.log(`🔀 Redirecting to /captcha/${selectedRoute}`);
    sessionStorage.setItem('secure_user_id', numericUserId.toString());
    // สั่ง Redirect ไปที่หน้า Captcha นั้นๆ พร้อมพก userId และ method ไปด้วย
    router.replace(`/captcha/${selectedRoute}?method=${method}`);
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