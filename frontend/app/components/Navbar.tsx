'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // 🚫 รายชื่อหน้าที่ "ไม่ต้องการ" ให้โชว์ปุ่ม Logout
  const hiddenPaths = ['/login', '/register', '/2fa'];
    if (hiddenPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }
  // เช็คว่า Path ปัจจุบันขึ้นต้นด้วยคำต้องห้ามไหม
  // (เช่น /2fa/challenge ก็จะถือว่าตรงกับ /2fa และถูกซ่อน)
  const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path));

  if (shouldHide) {
    return null; // ไม่แสดงอะไรเลย
  }

  const handleLogout = async () => {
    try {
      // 1. เรียก API ให้ Server ล้าง Cookie ให้สะอาด
      await fetch('/api/logout', { method: 'POST' });

      // 2. ล้าง Client Router Cache (สำคัญมาก! เพื่อไม่ให้มันจำหน้าเก่า)
      router.refresh();

      // 3. ส่งกลับไปหน้า Login
      router.replace('/login'); 
      
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: ถ้า API พัง ก็พยายามลบเองแบบเดิม
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