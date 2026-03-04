//components/TurnstileCaptcha.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Script from "next/script";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  onVerify?: () => void;
}

export default function TurnstileCaptcha({ userId, onVerify }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const [isError, setIsError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const isVerifying = useRef(false);

  // 🔥 1. ใช้ Ref เก็บเวลาที่โหลดหน้าเว็บครั้งแรกสุด (Absolute Start Time) 
  // ใช้ useRef แทน useState เพื่อไม่ให้เกิดการ Re-render โดยไม่จำเป็น
  const absoluteStartTime = useRef<number>(0);

  // 🔥 2. เริ่มจับเวลาทันทีที่หน้าเว็บโหลด
  useEffect(() => {
    absoluteStartTime.current = Date.now();
  }, []);

  const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const renderWidget = () => {
    if (containerRef.current && (window as any).turnstile) {
      if (widgetId.current) return;

      widgetId.current = (window as any).turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "light",
        size: "normal",
        
        // (สามารถเอา before-interactive-callback ออกได้ หรือปล่อยไว้ Log ดูเล่นก็ได้ครับ เราไม่ได้เอาไปคำนวณแล้ว)
        "before-interactive-callback": () => {
          console.log("⏱️ Widget Interactive Started");
        },

        callback: async (token: string) => {
          if (isVerifying.current) return; 
          isVerifying.current = true;
          
          // 🔥 3. คำนวณเวลารวมตั้งแต่โหลดหน้าเว็บ จนติ๊กถูกเสร็จ
          const endTime = Date.now();
          const timeTaken = Math.floor(endTime - absoluteStartTime.current);
          
          setStatus("Verifying...");

          try {
            const res = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/turnstile/verify`,
              { userId: userId, token, timeTaken }, // ส่ง timeTaken (ms) ไปให้ Backend เผื่อเก็บ Log
              { withCredentials: true },
            );

            if (res.data.success) {
              setStatus("Correct!");

              isVerifying.current = false;

              setTimeout(() => {
                if (onVerify) {
                  onVerify();
                } else {
                  router.push("/survey");
                }
              }, 1500);

            } else {
              console.error("Backend Error:", res.data);
              setStatus(`Verification Failed: ${res.data.message || "Unknown error"}`);
              
              setIsError(true); 
              setTimeout(() => setIsError(false), 400);

              isVerifying.current = false;
              if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
            }
          } catch (error) {
            console.error("Axios Network Error:", error);
            setStatus("Cannot connect to Backend (CORS or Network Error)");
            
            setIsError(true); 
            setTimeout(() => setIsError(false), 400);

            isVerifying.current = false;
            if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
          }
        },

        "error-callback": () => {
          setStatus("Cloudflare Widget Error");
          setIsError(true); 
          setTimeout(() => setIsError(false), 400);
          isVerifying.current = false;
          if (widgetId.current) (window as any).turnstile.reset(widgetId.current);
        },

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

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
        strategy="lazyOnload"
        onLoad={() => renderWidget()} 
      />

      <div className="min-h-[65px]">
        {SITE_KEY ? (
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