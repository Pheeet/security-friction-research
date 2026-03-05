//app/security-checkpoint/page.tsx
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const CheckpointLoadingUI = ({ message = "Preparing Security Challenge...", subMessage = "ระบบกำลังเตรียมด่านทดสอบความปลอดภัยที่เหมาะสม", color = "blue-600" }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-pulse flex flex-col items-center text-center px-4">
      <div className={`w-12 h-12 border-4 border-${color} border-t-transparent rounded-full animate-spin mb-4`}></div>
      <p className="text-gray-800 font-bold text-lg mb-2">{message}</p>
      <p className="text-gray-500 text-sm">{subMessage}</p>
    </div>
  </div>
);

function CheckpointRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);

  const [loadingState, setLoadingState] = useState<'preparing' | 'clearing'>('preparing');
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    if (hasRedirected.current) return;

    const urlToken = searchParams.get('token');
    if (urlToken) {
      sessionStorage.setItem('token', urlToken);
    }
    // 1. ดึงค่าที่ส่งมาจากหน้า Login หรือ Google SSO
    const userId = searchParams.get('userId');
    const method = searchParams.get('method') || 'email';

    let numericUserId = 0;

    if (userId) {
      // ถ้ามีใน URL ให้แอบเก็บลงกระเป๋าให้เรียบร้อย
      numericUserId = parseInt(userId, 10);
    } else {
      // ถ้าไม่มีใน URL ให้ดึงจากกระเป๋าที่ Login ยัดไว้ให้
      const sessionUserId = sessionStorage.getItem('secure_user_id');
      numericUserId = parseInt(sessionUserId || '0', 10);
    }

    sessionStorage.setItem('secure_user_id', numericUserId.toString());

    // 2. จัดการกับ URL Params ของ Captcha และ 2FA
    const urlCaptcha = searchParams.get('captcha');
    const urlReq2FA = searchParams.get('req2fa');

    if (urlCaptcha) sessionStorage.setItem('captcha_type', urlCaptcha);
    if (urlReq2FA) sessionStorage.setItem('require_2fa', urlReq2FA);

    const experimentMode = sessionStorage.getItem('experiment_mode') || 'static';
    const assignedCaptcha = sessionStorage.getItem('captcha_type');
    const require2FA = sessionStorage.getItem('require_2fa');

    // 3. Adaptive Mode: กรณีไม่ต้องทำ Captcha และ 2FA ให้ไปหน้า Survey เลย
    if (experimentMode === 'adaptive' && assignedCaptcha === 'none' && require2FA === 'false') {
      setLoadingState('clearing'); // เปิดหน้า Loading แบบเคลียร์ความปลอดภัย
      
      setTimeout(() => {
        window.location.href = '/survey'; 
      }, 2000); 
      return; 
    }

    let selectedRoute = '';
    const routes = ['text', 'math', 'slider', 'cloudflare'];

    // 4. ตัดสินใจเลือก Route ของ Captcha
    if (experimentMode === 'adaptive' && assignedCaptcha && assignedCaptcha !== 'none') {
      // โหมด Adaptive: ให้ไปยังด่านที่ Backend คัดกรองมาให้แล้ว
      selectedRoute = assignedCaptcha;
      console.log(`Adaptive Mode: Backend assigned -> ${selectedRoute}`);
      
    } else {
      // โหมด Static: ใช้ Round-Robin + Offset จากไฟล์เก่าที่คุณเขียนไว้
      const attemptKey = `captcha_attempt_${numericUserId}`;
      const currentAttempt = parseInt(localStorage.getItem(attemptKey) || '0', 10);

      let index;
      if (isNaN(numericUserId)) {
        // fallback ถ้า userId แปลงไม่ได้ ให้สุ่มเอาเผื่อเหนียว
        index = Math.floor(Math.random() * routes.length);
      } else {
        // ✅ Round Robin + Offset
        index = (numericUserId + currentAttempt) % routes.length;
      }

      selectedRoute = routes[index];
      console.log(`Static Mode: Round-Robin + Offset assigned -> ${selectedRoute} (attempt ${currentAttempt})`);

      // เพิ่มจำนวนรอบ (เฉพาะตอนเล่น Static Mode จะได้ไม่กวนการนับของ Adaptive)
      localStorage.setItem(attemptKey, (currentAttempt + 1).toString());
    }

    hasRedirected.current = true;

    // 5. อัปเดต Session และทำการ Redirect
    setTimeout(() => {
      router.replace(`/captcha/${selectedRoute}?method=${method}`);
    }, 2000);
    
  }, [router, searchParams]);

  if (!isMounted) {
    return <CheckpointLoadingUI />;
  }
  // UI สำหรับจังหวะข้ามไป Survey
  if (loadingState === 'clearing') {
    return (
      <CheckpointLoadingUI 
        message="Security Clearance Granted" 
        subMessage="ตรวจสอบผ่าน กำลังพาท่านเข้าสู่ระบบอย่างปลอดภัย" 
        color="emerald-500" 
      />
    );
  }

  // UI ค่าเริ่มต้น (สีน้ำเงิน)
  return <CheckpointLoadingUI />;
}

export default function SecurityCheckpointPage() {
  return (
    <Suspense fallback={<CheckpointLoadingUI />}>
      <CheckpointRedirector />
    </Suspense>
  );
}