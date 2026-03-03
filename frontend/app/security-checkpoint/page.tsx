'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CheckpointRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // ดึงค่าที่ส่งมาจากหน้า Login หรือ Google SSO
    const userId = searchParams.get('userId');
    const method = searchParams.get('method') || 'email';

    let numericUserId = 0;

    if (userId) {
      // ถ้ามีใน URL ให้แอบเก็บลงกระเป๋าให้เรียบร้อย
      numericUserId = parseInt(userId, 10);
      sessionStorage.setItem('secure_user_id', numericUserId.toString());
    } else {
      // ถ้าไม่มีใน URL ให้ดึงจากกระเป๋าที่ Login ยัดไว้ให้
      const sessionUserId = sessionStorage.getItem('secure_user_id');
      numericUserId = parseInt(sessionUserId || '0', 10);
    }

    const urlCaptcha = searchParams.get('captcha');
    const urlReq2FA = searchParams.get('req2fa');

    if (urlCaptcha) sessionStorage.setItem('captcha_type', urlCaptcha);
    if (urlReq2FA) sessionStorage.setItem('require_2fa', urlReq2FA);

    const experimentMode = sessionStorage.getItem('experiment_mode') || 'static';
    const assignedCaptcha = sessionStorage.getItem('captcha_type');
    const require2FA = sessionStorage.getItem('require_2fa');

    if (experimentMode === 'adaptive' && assignedCaptcha === 'none' && require2FA === 'false') {
      setIsClearing(true); // เปิดหน้า Loading
      
      setTimeout(() => {
        router.replace('/survey'); 
      }, 2000); 
      return; 
    }

    

    let selectedRoute = '';
    // ใช้ Round-Robin แทน Random
    // ใช้การหารเอาเศษ (Modulo) 
    // ถ้า userId = 1 -> ได้ 1 (math)
    // ถ้า userId = 2 -> ได้ 2 (slider)
    // ถ้า userId = 3 -> ได้ 3 (cloudflare)
    // ถ้า userId = 4 -> ได้ 0 (text)
    // ถ้าบังเอิญ userId แปลงเป็นเลขไม่ได้ (NaN) ให้ fallback กลับไปสุ่มเผื่อเหนียว


    if (experimentMode === 'adaptive' && assignedCaptcha && assignedCaptcha !== 'none') {
      // โหมด Adaptive: ให้ไปยังด่านที่ Backend คัดกรองมาให้แล้ว
      selectedRoute = assignedCaptcha;
      console.log(`Adaptive Mode: Backend assigned -> ${selectedRoute}`);
    } else {
      // โหมด Static (ระบบเดิม): ใช้ Round-Robin สุดฉลาดของคุณติณห์
      const routes = ['text', 'math', 'slider', 'cloudflare'];
      const index = isNaN(numericUserId) ? Math.floor(Math.random() * routes.length) : (numericUserId % routes.length);
      selectedRoute = routes[index];
      console.log(`Static Mode: Round-Robin assigned -> ${selectedRoute}`);
    }

    sessionStorage.setItem('secure_user_id', numericUserId.toString());
    // สั่ง Redirect ไปที่หน้า Captcha นั้นๆ พร้อมพก userId และ method ไปด้วย
    router.replace(`/captcha/${selectedRoute}?method=${method}`);
  }, [router, searchParams]);

  if (isClearing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Finalizing security clearance...</p>
        </div>
      </div>
    );
    }

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