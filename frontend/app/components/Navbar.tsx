'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // 🚫 1. หน้าที่ "ไม่ต้องการ" ให้โชว์ปุ่ม Logout แบบระบุชื่อเป๊ะๆ (Exact Match)
  const exactHiddenPaths = ['/', '/welcome', '/login', '/register'];
  
  // 🚫 2. โฟลเดอร์หน้าที่ต้องการซ่อนทั้งหมด (Prefix Match)
  // (เช่น ถ้ามี /2fa/challenge, /2fa/email ก็จะถูกซ่อนทั้งหมด)

  // ตรวจสอบเงื่อนไขว่าตรงกับข้อ 1 หรือข้อ 2 ไหม
  const isExactHidden = exactHiddenPaths.includes(pathname);
  // ถ้าตรงเงื่อนไขข้อใดข้อหนึ่ง ให้ซ่อน Navbar (return null)
  if (isExactHidden) {
    return null; 
  }

  const handleLogout = async () => {
    try {
      // 🔥 0. ล้างข้อมูลจับเวลาของงานวิจัยทิ้งทั้งหมด! (สำคัญมากสำหรับการทดลอง)
      sessionStorage.clear();

      // 1. เรียก API ให้ Server ล้าง Cookie ให้สะอาด
      await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      // 2. ล้าง Client Router Cache 
      router.refresh();

      // 3. ส่งกลับไปหน้า Login
      router.replace('/login'); 
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: ล้างไพ่แบบ Manual
      sessionStorage.clear(); 
      document.cookie = "is-logged-in=; path=/; max-age=0";
      window.location.href = '/login';
    }
  };

  return (
    <nav className="fixed top-0 right-0 p-4 z-50">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full shadow-lg transition-all duration-200"
      >
        <span>🚪</span> Logout
      </button>
    </nav>
  );
}