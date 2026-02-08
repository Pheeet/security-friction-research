"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Props {
  type: "text" | "math";
  title: string;
}

export default function CaptchaTest({ type, title }: Props) {
  const router = useRouter();
  const [imageURL, setImageURL] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      setStatus(null);
      setInput("");
      
      const res = await axios.get(`http://localhost:8080/api/captcha?type=${type}`);
      setImageURL(res.data.image);
      setCaptchaId(res.data.captchaId);
      setStartTime(Date.now()); // เริ่มจับเวลาใหม่ทุกครั้งที่รีเฟรช

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCaptcha = async () => {
    if (!input) return;
    const duration = Date.now() - startTime;

    try {
      const res = await axios.post("http://localhost:8080/api/verify", {
        captchaId: captchaId,
        captchaType: type,
        answer: input,
        timeTaken: duration 
      });

      setStatus({
        success: res.data.success,
        message: res.data.message
      });

      if (res.data.success) {
        setTimeout(() => router.push("/"), 1500); 
      } else {
        fetchCaptcha(); // ผิดแล้วเปลี่ยนโจทย์ให้เลย
      }

    } catch (error) {
      console.error("Error verifying:", error);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-center mb-6 text-gray-800">{title}</h1>
        
        {/* ส่วนแสดงผลรูปภาพ + ปุ่ม Refresh */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-full p-4 bg-gray-100 rounded-lg border min-h-[100px] relative">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : imageURL ? (
              <img src={imageURL} alt="CAPTCHA" className="h-16 object-contain select-none" />
            ) : (
              <span className="text-red-500">Error Loading</span>
            )}
          </div>

          {/* 👇 ปุ่ม Refresh อยู่ตรงนี้ */}
          <button 
            onClick={fetchCaptcha}
            className="mt-3 text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer group"
            title="เปลี่ยนรูปใหม่"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="group-hover:rotate-180 transition-transform duration-500"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            อ่านไม่ออก? ขอรูปใหม่
          </button>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifyCaptcha()}
          placeholder={type === "math" ? "ผลลัพธ์คือ?" : "พิมพ์ตัวอักษรที่เห็น"}
          className="w-full px-4 py-3 border rounded-lg mb-4 text-center text-lg text-black focus:ring-2 focus:ring-blue-500 outline-none"
          autoFocus
        />

        <button
          onClick={verifyCaptcha}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md hover:shadow-lg"
        >
          Submit Answer
        </button>
        
        {status && (
          <div className={`mt-4 p-3 rounded text-center font-bold animate-pulse ${status.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}