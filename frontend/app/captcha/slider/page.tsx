//app/captcha/slider
'use client';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SliderCaptcha from "@/app/components/SliderCaptcha";

function SliderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const method = searchParams.get('method') || 'email';


  const [isVerifying, setIsVerifying] = useState(false);
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('secure_user_id');
    if (!storedUserId) {
      alert("Session expired. Please login again.");
      router.push('/login');
      return;
    }
    setUserId(storedUserId);
  }, [router]);


  const handleSuccess = async () => {
    if (!userId) return;

    const require2FA = sessionStorage.getItem('require_2fa');

    if (require2FA === 'false') {
      console.log('Adaptive Mode: Skipping 2FA -> Go to Survey');
      setIsVerifying(true); 
      setTimeout(() => {
        window.location.href = '/survey'; 
      }, 2000);
      return;
    }

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
        setIsVerifying(true);
        setTimeout(() => {
          router.replace(`/2fa/challenge?method=${method}&refCode=${data.ref_code}`);
        }, 1500);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-gray-500 font-medium">Loading Slider Challenge...</div>
      </div>
    );
  }
  
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800 font-bold text-lg mb-2">Challenge Verified</p>
          <p className="text-gray-500 text-sm">ตรวจสอบสำเร็จ กำลังพาท่านไปยังขั้นตอนถัดไป</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <SliderCaptcha userId={userId || ""} onSuccess={handleSuccess} />
    </div>
  );
}


export default function SliderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SliderContent />
    </Suspense>
  );
}