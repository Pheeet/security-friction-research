'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const hiddenPaths = ['/login', '/register', '/2fa'];
  
  // โค้ดตรงนี้ของคุณมีเขียนเช็คซ้ำกัน 2 รอบ ผมเลยรวบให้เหลือแค่นี้ครับจะได้คลีนๆ
  const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path));

  if (shouldHide) {
    return null; 
  }

  const handleLogout = async () => {
    try {
      // 🔥 0. ล้างข้อมูลจับเวลาของงานวิจัยทิ้งทั้งหมด! (สำคัญมากสำหรับการทดลอง)
      sessionStorage.clear();

      // 1. เรียก API ให้ Server ล้าง Cookie ให้สะอาด
      await fetch('/api/logout', { method: 'POST' });

      // 2. ล้าง Client Router Cache 
      router.refresh();

      // 3. ส่งกลับไปหน้า Login
      router.replace('/login'); 
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: ล้างไพ่แบบ Manual
      sessionStorage.clear(); // เผื่อ API พังก็ต้องล้าง Data ด้วย
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