//app/thank-you
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ThankYouPage() {
  const router = useRouter()
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(false);

  useEffect(() => {
    const currentMode = sessionStorage.getItem('experiment_mode') || 'static';

    if (currentMode === 'adaptive') {
      setIsAdaptiveMode(true);
    }

    sessionStorage.removeItem('secure_user_id')
  }, []);

  const handleLogoutAndRedirect = async (destination: string) => {
    try {
      // ยิงไปที่ Next.js API Route ของคุณติณห์เพื่อเคลียร์ Cookies ให้เกลี้ยง!
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    if (destination === '/login') {
      // ฝังโหมด Adaptive แล้วส่งกลับไปหน้า Login
      sessionStorage.setItem('experiment_mode', 'adaptive');
      document.cookie = "experiment_mode=adaptive; path=/";
      router.push('/login');
    } else {
      sessionStorage.clear();
      document.cookie = "experiment_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = destination;
    }
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
          // หน้าจอเมื่อทำครบ 2 ระบบแล้ว (จบการทดสอบ 100%)
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">เสร็จสิ้นการทดสอบโดยสมบูรณ์!</h1>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              ขอขอบคุณที่สละเวลาเข้าร่วมการทดสอบทั้ง 2 รูปแบบครับ <br/>
              ข้อมูลของคุณเป็นประโยชน์อย่างยิ่งต่องานวิจัยชิ้นนี้
            </p>
            <button 
              onClick={() => handleLogoutAndRedirect('/')}
              className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              กลับสู่หน้าหลัก
            </button>
          </>
        ) : (
          // หน้าจอเมื่อเพิ่งจบระบบปกติ และชวนให้ทำระบบ Adaptive ต่อ
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
              // แก้บรรทัดนี้: ให้เรียกฟังก์ชันที่เรามีระบบ Logout ฝังอยู่
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