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
      router.replace('/survey');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-gray-500 font-medium">Loading Slider Challenge...</div>
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