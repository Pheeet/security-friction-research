// app/security-checkpoint/page.tsx
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

    // 1. ดึงค่าที่ส่งมาจากหน้า Login หรือ Google SSO
    const urlToken = searchParams.get('token');
    if (urlToken) {
      sessionStorage.setItem('token', urlToken);
      
      // 🛡️ [เพิ่มบรรทัดนี้] สร้างคุกกี้ให้ Vercel (Next.js Middleware) รู้จัก Token นี้ด้วย!
      const cookiePolicy = process.env.NODE_ENV === "production" ? "; SameSite=None; Secure" : "; SameSite=Lax";
      document.cookie = `auth_token=${urlToken}; path=/; max-age=86400${cookiePolicy}`;
    }
    
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

    // 💡 3. ฟังก์ชันตัวช่วยดึง Cookie ป้องกัน Session หายตอนเปลี่ยนหน้า
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    // ใช้ Cookie เป็นตัวตัดสินหลัก ถ้าไม่มีค่อยหาใน Session
    const cookieMode = getCookie('experiment_mode');
    const sessionMode = sessionStorage.getItem('experiment_mode');
    const experimentMode = cookieMode === 'adaptive' ? 'adaptive' : (sessionMode || 'static');

    // ซ่อม SessionStorage ให้ตรงกับความเป็นจริง
    if (experimentMode === 'adaptive') {
      sessionStorage.setItem('experiment_mode', 'adaptive');
    }

    const assignedCaptcha = sessionStorage.getItem('captcha_type');
    const require2FA = sessionStorage.getItem('require_2fa');

    let selectedRoute = '';
    const routes = ['text', 'math', 'slider', 'cloudflare'];

    // 🚦 4. แยกทางแยกระหว่าง Adaptive กับ Static อย่างเด็ดขาด
    if (experimentMode === 'adaptive') {
      // 🟢 บล็อกโหมด Adaptive
      if (assignedCaptcha === 'none' && require2FA === 'false') {
        // Low Risk: ปล่อยผ่านไป Survey
        setLoadingState('clearing'); 
        setTimeout(() => {
          window.location.href = '/survey'; 
        }, 2000); 
        hasRedirected.current = true;
        return; 
      } else if (assignedCaptcha && assignedCaptcha !== 'none') {
        // Medium/High Risk: ไปด่านที่ Backend สั่งมา
        selectedRoute = assignedCaptcha;
        console.log(`🛡️ Adaptive Mode: Backend assigned -> ${selectedRoute}`);
      } else {
        // กันเหนียว: เผื่อข้อมูล assignedCaptcha หาย ให้สุ่มด่านไปก่อน แต่ต้องไม่บันทึกว่าเป็น Static
        selectedRoute = routes[Math.floor(Math.random() * routes.length)];
        console.log(`🛡️ Adaptive Mode (Fallback): Random assigned -> ${selectedRoute}`);
      }

    } else {
      // 🔵 บล็อกโหมด Static (Round-Robin)
      const attemptKey = `captcha_attempt_${numericUserId}`;
      const currentAttempt = parseInt(localStorage.getItem(attemptKey) || '0', 10);

      let index;
      if (isNaN(numericUserId)) {
        index = Math.floor(Math.random() * routes.length);
      } else {
        index = (numericUserId + currentAttempt) % routes.length;
      }

      selectedRoute = routes[index];
      console.log(`⚙️ Static Mode: Round-Robin + Offset assigned -> ${selectedRoute} (attempt ${currentAttempt})`);

      // เพิ่มจำนวนรอบเฉพาะใน Static Mode
      localStorage.setItem(attemptKey, (currentAttempt + 1).toString());
    }

    hasRedirected.current = true;

    // 5. ทำการ Redirect ไปหน้า Captcha ที่เลือกไว้
    setTimeout(() => {
      router.replace(`/captcha/${selectedRoute}?method=${method}`);
    }, 2000);
    
  }, [router, searchParams]);

  if (!isMounted) {
    return <CheckpointLoadingUI />;
  }

  // UI สำหรับจังหวะข้ามไป Survey (Low Risk)
  if (loadingState === 'clearing') {
    return (
      <CheckpointLoadingUI 
        message="Security Clearance Granted" 
        subMessage="ตรวจสอบผ่าน กำลังพาท่านเข้าสู่ระบบอย่างปลอดภัย" 
        color="emerald-500" 
      />
    );
  }

  // UI ค่าเริ่มต้น (เตรียมด่าน Captcha)
  return <CheckpointLoadingUI />;
}

export default function SecurityCheckpointPage() {
  return (
    <Suspense fallback={<CheckpointLoadingUI />}>
      <CheckpointRedirector />
    </Suspense>
  );
}