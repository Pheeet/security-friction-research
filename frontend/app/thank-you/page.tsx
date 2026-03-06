//app/thank-you/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ThankYouPage() {
  const router = useRouter()
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  useEffect(() => {
    const currentMode = sessionStorage.getItem('experiment_mode') || 'static';

    if (currentMode === 'adaptive') {
      setIsAdaptiveMode(true);
    }

    sessionStorage.removeItem('secure_user_id')
  }, []);

  const handleLogoutAndRedirect = async (destination: string) => {
    if (redirectTarget) return;
    setRedirectTarget(destination);

    try {
      // ยิงไปที่ Next.js API Route ของคุณเพื่อเคลียร์ Cookies ให้เกลี้ยง!
      await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    sessionStorage.clear();

    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    if (destination === '/login') {
      // ฝังโหมด Adaptive แล้วส่งกลับไปหน้า Login
      sessionStorage.setItem('experiment_mode', 'adaptive');
      const cookiePolicy = process.env.NODE_ENV === "production" ? "; SameSite=None; Secure" : "; SameSite=Lax";
      document.cookie = `experiment_mode=adaptive; path=/; max-age=3600${cookiePolicy}`;
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      setTimeout(() => {
        window.location.href = destination;
      }, 1000);
    }
  }

  if (redirectTarget) {
    const isGoingToAdaptive = redirectTarget === '/login';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          {/* เปลี่ยนสีวงกลมตามโหมด */}
          <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4 
            ${isGoingToAdaptive ? 'border-blue-600' : 'border-gray-600'}`}>
          </div>
          
          {/* เปลี่ยนข้อความตามโหมด */}
          <p className="text-gray-800 font-bold text-lg mb-2">
            {isGoingToAdaptive ? 'Switching to Adaptive Mode...' : 'Returning to Home...'}
          </p>
          <p className="text-gray-500 text-sm">
            {isGoingToAdaptive ? 'กำลังสลับเข้าสู่โหมดปรับตัวอัตโนมัติ' : 'กำลังเคลียร์ข้อมูลและพาคุณกลับสู่หน้าหลัก'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-10">
        
        {/* ไอคอนติ๊กถูกใหญ่ๆ */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        {isAdaptiveMode ? (
          // ==========================================
          // หน้าจอเมื่อทำครบ 2 ระบบ (Adaptive จบแล้ว)
          // ==========================================
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">เสร็จสิ้นการทดสอบโดยสมบูรณ์!</h1>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              ขอขอบคุณที่สละเวลาเข้าร่วมการทดสอบทั้ง 2 รูปแบบครับ <br/>
              ข้อมูลของคุณเป็นประโยชน์อย่างยิ่งต่องานวิจัยชิ้นนี้
            </p>
            <button 
              // 👇 เปลี่ยนตรงนี้ให้ชี้ไปที่หน้า /welcome
              onClick={() => handleLogoutAndRedirect('/')}
              className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              กลับสู่หน้าหลัก
            </button>
          </>
        ) : (
          // ==========================================
          // หน้าจอเมื่อเพิ่งจบระบบปกติ (Static)
          // ==========================================
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">ขอบคุณสำหรับข้อมูลส่วนแรกครับ!</h1>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              ระบบที่คุณเพิ่งทดสอบไปคือ "ระบบความปลอดภัยแบบมาตรฐาน" <br className="hidden sm:block"/>
              ต่อไป เราขอเชิญคุณทดสอบ <span className="font-bold text-blue-600">"ระบบความปลอดภัยแบบปรับตัวได้ (Adaptive Security)"</span> <br/>
              ซึ่งระบบจะวิเคราะห์พฤติกรรมของคุณเพื่อปรับความยากให้เหมาะสม
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                สิ่งที่คุณจะได้พบในรอบต่อไป:
              </h3>
              <ul className="text-blue-700 text-sm space-y-2 ml-7 list-disc">
                <li>ระบบอาจจะให้คุณเข้าสู่ระบบได้ทันทีโดยไม่ต้องทำ Captcha</li>
                <li>หรือระบบอาจจะสุ่มด่านความปลอดภัยให้ตามความเหมาะสม</li>
                <li>ลองแกล้งพิมพ์รหัสผ่านเร็วๆ ก๊อปปี้วาง หรือใช้เวลาพิมพ์นานๆ ดูได้ครับ!</li>
              </ul>
            </div>

            <button 
              // 👇 ตรงนี้ชี้ไปที่ /login ถูกต้องแล้วครับ
              onClick={() => handleLogoutAndRedirect('/login')} 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
            >
              เริ่มทดสอบระบบ Adaptive
            </button>
          </>
        )}
      </div>
    </div>
  );
}