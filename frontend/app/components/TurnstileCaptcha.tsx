"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function TurnstileCaptcha() {
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  // ใส่ Dummy Site Key ของ Cloudflare (ใช้ได้จริงสำหรับการเทส)
  const SITE_KEY = "1x00000000000000000000AA";

  const handleSuccess = async (token: string) => {
    try {
      // เมื่อ Cloudflare บอกว่า "ผ่าน" มันจะให้ Token มา
      // เราต้องเอา Token นี้ไปส่งให้ Backend ตรวจซ้ำอีกที (Double Check)
      const res = await axios.post(
        "http://localhost:8080/api/turnstile/verify",
        { token: token },
        { withCredentials: true }
      );

      if (res.data.success) {
        setStatus("Correct! 🎉");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setStatus("Verification Failed ❌");
      }
    } catch (error) {
      console.error("Error verifying turnstile:", error);
      setStatus("Error connecting to server");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800">Cloudflare Turnstile</h2>
      <p className="text-gray-500 mb-4">Click the checkbox to verify</p>

      {/* Widget ของ Cloudflare */}
      <div className="min-h-[65px]">
        <Turnstile 
            siteKey={SITE_KEY} 
            onSuccess={handleSuccess} 
            onError={() => setStatus("Cloudflare Error ❌")}
        />
      </div>

      {status && (
        <div className={`font-semibold text-lg ${status.includes("Correct") ? "text-green-600" : "text-red-600"}`}>
          {status}
        </div>
      )}
    </div>
  );
}