//app/captcha/math
'use client';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CaptchaTest from "@/app/components/CaptchaTest";

function MathContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get('method') || 'email';

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('secure_user_id');
    if (!storedUserId) {
      alert("Session expired. Please login again.");
      router.push('/login');
      return;
    }
    setUserId(storedUserId);
  }, [router]);
  // ฟังก์ชันนี้จะส่งลงไปให้ Component เรียกใช้ตอนทำ Captcha ถูกต้อง
  const handleSuccess = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/2fa/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId || '0', 10),
          method: method
        }),
      });

      const data = await res.json();

      if (data.success) {
        // ขอ OTP สำเร็จ ไปหน้า 2FA
        router.replace(`/2fa/challenge?method=${method}&refCode=${data.ref_code}`);
      } else {
        alert("Failed to request 2FA: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error requesting 2FA");
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500 font-medium">Loading Math Challenge...</div>
      </div>
    );
  }

  return (
    // ส่งฟังก์ชัน handleSuccess เข้าไปเป็น Props
    <CaptchaTest 
      userId={userId || ""} 
      type="math" 
      title="Solve this math problem" 
      onSuccess={handleSuccess} 
    />
  );
}

export default function MathPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MathContent />
    </Suspense>
  );
}