'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // 🚫 รายชื่อหน้าที่ "ไม่ต้องการ" ให้โชว์ปุ่ม Logout
  const hiddenPaths = ['/login', '/register', '/2fa'];

  // เช็คว่า Path ปัจจุบันขึ้นต้นด้วยคำต้องห้ามไหม
  // (เช่น /2fa/challenge ก็จะถือว่าตรงกับ /2fa และถูกซ่อน)
  const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path));

  if (shouldHide) {
    return null; // ไม่แสดงอะไรเลย
  }

  const handleLogout = () => {
    // 1. ลบ Cookie 'is-logged-in' โดยตั้งอายุให้หมดทันที (Expires in past)
    document.cookie = "is-logged-in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    
    // (Optional) ถ้ามี Cookie อื่นๆ เช่น session ของ Backend ก็ลบด้วย
    // document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    // 2. เด้งกลับไปหน้า Login
    router.push('/login');
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