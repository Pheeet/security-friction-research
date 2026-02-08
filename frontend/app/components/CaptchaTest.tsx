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
      setStartTime(Date.now()); // เริ่มจับเวลา

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
        setTimeout(() => router.push("/"), 1500); // ถูกแล้วกลับหน้าเมนู
      } else {
        fetchCaptcha(); // ผิดแล้วขอใหม่
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
        
        <div className="flex justify-center mb-6 p-4 bg-gray-100 rounded-lg border min-h-[100px] items-center">
          {loading ? (
            <span className="animate-pulse text-gray-500">Loading...</span>
          ) : imageURL ? (
            <img src={imageURL} alt="CAPTCHA" className="h-16 object-contain" />
          ) : (
            <span className="text-red-500">Error Loading</span>
          )}
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifyCaptcha()}
          placeholder={type === "math" ? "ผลลัพธ์คือ?" : "พิมพ์ตัวอักษรที่เห็น"}
          className="w-full px-4 py-3 border rounded-lg mb-4 text-center text-lg text-black"
          autoFocus
        />

        <button
          onClick={verifyCaptcha}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
        >
          Submit Answer
        </button>
        
        {status && (
          <div className={`mt-4 p-3 rounded text-center font-bold ${status.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}