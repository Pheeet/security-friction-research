'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.clear();
    document.cookie = "experiment_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }, []);

  const handleStartTest = () => {
    sessionStorage.setItem('experiment_mode', 'static');
    document.cookie = "experiment_mode=static; path=/";
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-center">
      {/* 👇 เปลี่ยนจาก max-w-xl เป็น max-w-2xl ตรงนี้ครับ 👇 */}
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-10">
        
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ยินดีต้อนรับสู่การทดสอบระบบ!
        </h1>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          งานวิจัยนี้มีวัตถุประสงค์เพื่อศึกษาพฤติกรรมผู้ใช้งาน <br className="hidden sm:block"/>
          และประเมินระดับความพึงพอใจต่อระบบรักษาความปลอดภัย <br className="hidden sm:block"/>
          ในการยืนยันตัวตน (Authentication) รูปแบบต่างๆ
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            คำแนะนำเบื้องต้น:
          </h3>
          <ul className="text-blue-700 text-sm space-y-3 ml-7 list-disc">
            <li>
              การทดสอบแบ่งออกเป็น <span className="font-bold">2 รอบ</span> คือ ระบบมาตรฐาน และ ระบบที่ปรับตัวได้
            </li>
            <li>
              ในแต่ละรอบ ให้คุณทำการ <span className="font-bold">"เข้าสู่ระบบ (Login)"</span> ตามขั้นตอนที่ปรากฏบนหน้าจอ
            </li>
            <li>
              พิมพ์รหัสผ่านตามธรรมชาติของคุณได้เลย (ไม่ว่าจะพิมพ์ช้า พิมพ์เร็ว กดผิดลบใหม่ หรือก๊อปปี้วาง ระบบรองรับทั้งหมดครับ)
            </li>
            <li>
              เมื่อเข้าสู่ระบบสำเร็จ จะมีแบบสอบถามสั้นๆ 5 ข้อ กรุณาตอบคำถามตามความจริง
            </li>
            <li>
              กรุณา <span className="font-bold">อย่าใช้</span> รหัสผ่านจริงของบัญชีส่วนตัวที่สำคัญในการทดสอบนี้ ให้ใช้รหัสผ่านสมมติที่พิมพ์ได้สะดวกแทน
            </li>
          </ul>
        </div>

        <button 
          onClick={handleStartTest}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-xl text-lg transition-all transform hover:scale-105 shadow-md hover:shadow-xl"
        >
          เริ่มต้นการทดสอบ
        </button>

      </div>
    </div>
  );
}