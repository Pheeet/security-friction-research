"use client";

import { useState, useRef } from "react";
import Script from "next/script";
import axios, { formToJSON } from "axios";
import { useRouter } from "next/navigation";

interface Props {
  onVerify?: () => void;
}

export default function TurnstileCaptcha({ onVerify }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const [isError, setIsError] = useState(false);
  // 1. Ref สำหรับจับ element ที่จะวาง Widget
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 2. Ref สำหรับเก็บ ID ของ Widget (เอาไว้สั่ง reset)
  const widgetId = useRef<string | null>(null);

  // 3. Ref กันยิงซ้ำ (สำคัญมากสำหรับปัญหานี้)
  const isVerifying = useRef(false);

  const startTime = useRef<number | null>(null);
  const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  // ฟังก์ชันเริ่มสร้าง Widget (จะถูกเรียกเมื่อ Script โหลดเสร็จ)
  const renderWidget = () => {
    if (containerRef.current && (window as any).turnstile) {
      // ป้องกันการ render ซ้ำซ้อน
      if (widgetId.current) return;

      // สั่ง Render และเก็บ ID ไว้
      widgetId.current = (window as any).turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        size: "normal",
        
        "before-interactive-callback": () => {
          startTime.current = Date.now();
          console.log("⏱️ Timer Started");
        },

        // เมื่อ User ติ๊กถูกและได้ Token
        callback: async (token: string) => {
          if (isVerifying.current) return; // กันเบิ้ล
          isVerifying.current = true;
          
          const endTime = Date.now();
          const timeTaken = startTime.current 
            ? Math.floor(endTime - startTime.current) // หน่วยเป็น Milliseconds
            : 0;
          
          setStatus("Verifying...");

          try {
            const res = await axios.post(
              "http://localhost:8080/api/turnstile/verify",
              { token, timeTaken },
              { withCredentials: true }
            );

            if (res.data.success) {
              setStatus("Correct!");
              setTimeout(() => {
                if (onVerify) {
                  onVerify();
                } else {
                  router.push("/");
                }
              }, 1500);
            } else {
              console.error("Backend Error:", res.data);
              setStatus(`Verification Failed: ${res.data.message || "Unknown error"}`);
              
              setIsError(true); // สั่น
              setTimeout(() => setIsError(false), 400);

              // รีเซ็ตเพื่อให้กดใหม่ได้
              isVerifying.current = false;
              if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
            }
          } catch (error) {
            console.error("Axios Network Error:", error);
            setStatus("Cannot connect to Backend (CORS or Network Error)");
            
            setIsError(true); // สั่น
            setTimeout(() => setIsError(false), 400);

            // รีเซ็ตเพื่อให้กดใหม่ได้
            isVerifying.current = false;
            if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
          }
        },

        // กรณี Error จาก Cloudflare เอง
        "error-callback": () => {
          setStatus("Cloudflare Widget Error");
          setIsError(true); // สั่น
          setTimeout(() => setIsError(false), 400);
          isVerifying.current = false;
          if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
        },

        // กรณี Token หมดอายุ (User ทิ้งไว้นาน)
        "expired-callback": () => {
          setStatus("Token expired. Please retry.");
          isVerifying.current = false;
          if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
        },
      });
    }
  };

  return (
    <div className={`flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-2xl ${isError ? "animate-shake border-2 border-red-400" : ""}`}>
      <h2 className="text-2xl font-bold text-gray-800">Cloudflare Turnstile</h2>

      {/* โหลด Script ของ Cloudflare */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
        strategy="lazyOnload"
        onLoad={() => renderWidget()} // เรียกฟังก์ชันเมื่อโหลดเสร็จ
      />

      <div className="min-h-[65px]">
        {SITE_KEY ? (
          /* พื้นที่วาง Widget */
          <div ref={containerRef} />
        ) : (
          <p className="text-red-500">Missing Site Key</p>
        )}
      </div>

      {status && (
        <div
          className={`font-semibold text-lg ${
            status.includes("Correct") ? "text-green-600" : "text-red-600"
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}