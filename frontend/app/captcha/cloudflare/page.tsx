//app/captcha/cloudflare
'use client';

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TurnstileCaptcha from "@/app/components/TurnstileCaptcha";

function CloudflareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const method = searchParams.get('method') || 'email';

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
        router.push(`/2fa/challenge?userId=${userId}&method=${method}&refCode=${data.ref_code}`);
      } else {
        alert("Failed to request 2FA: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error requesting 2FA");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <TurnstileCaptcha onVerify={handleSuccess} />
    </div>
  );
}

export default function CloudflarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CloudflareContent />
    </Suspense>
  );
}