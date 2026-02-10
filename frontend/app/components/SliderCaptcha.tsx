"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SliderCaptcha() {
  const [bgImage, setBgImage] = useState<string>("");
  const [pieceImage, setPieceImage] = useState<string>("");
  const [pieceY, setPieceY] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0); // ค่า X ที่ User ลาก
  const [status, setStatus] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0); // จับเวลา
  const [isLoading, setIsLoading] = useState(true);

  const [captchaWidth, setCaptchaWidth] = useState<number>(300); 
  const [captchaHeight, setCaptchaHeight] = useState<number>(150);

  const router = useRouter();

  // โหลดโจทย์เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    setIsLoading(true);
    setStatus(null);
    setSliderValue(0);
    try {
      const res = await axios.get("http://localhost:8080/api/slider", {
        withCredentials: true,
      });
      setBgImage(res.data.originalImage);
      setPieceImage(res.data.puzzlePiece);
      setPieceY(res.data.y);
      if (res.data.width) setCaptchaWidth(res.data.width);
      if (res.data.height) setCaptchaHeight(res.data.height);
      setStartTime(Date.now()); // เริ่มจับเวลา
    } catch (error) {
      console.error("Error loading captcha:", error);
      setStatus("Error loading captcha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    // หยุด user ไม่ให้กดรัวๆ ระหว่างรอผล
    if (isLoading) return;

    const timeTaken = Date.now() - startTime;

    try {
      const res = await axios.post(
        "http://localhost:8080/api/slider/verify",
        {
          x: sliderValue, // ส่งตำแหน่งที่ลากไป
          timeTaken: timeTaken,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        setStatus("Correct! 🎉");
        setTimeout(() => router.push("/"), 1500); // ผ่านแล้วไปหน้าแรก
      } else {
        setStatus("Incorrect! ❌");
        // ถ้าผิด ให้รอ 1 วิ แล้วโหลดโจทย์ข้อใหม่ (เพื่อความปลอดภัย)
        setTimeout(() => {
            fetchCaptcha();
        }, 1000);
      }
    } catch (error) {
      console.error("Verify error:", error);
      setStatus("Error verifying");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-2xl max-w-md w-full">
      <h2 className="text-2xl font-bold text-gray-800">Slider Verification</h2>
      
      {isLoading && !bgImage ? (
        <div className="bg-gray-200 animate-pulse rounded flex items-center justify-center"
        style={{ width: `${captchaWidth}px`, height: `${captchaHeight}px` }}
        >
            Loading...
        </div>
      ) : (
        <div className="relative group">
            {/* 1. Container หลัก (ขนาดต้องเท่ากับรูปที่ Backend ส่งมา) */}
            <div className="relative rounded-lg overflow-hidden shadow-inner border border-gray-300"
            style={{ width: `${captchaWidth}px`, height: `${captchaHeight}px` }}>
                
                {/* 1.1 รูปพื้นหลัง: ใส่ {bgImage && ...} ครอบไว้ */}
                {bgImage && (
                    <img 
                        src={bgImage} 
                        alt="Background" 
                        className="w-full h-full object-none" 
                    />
                )}

                {/* 1.2 ชิ้นจิ๊กซอว์ (Absolute Position) */}
                <img
                    src={pieceImage}
                    alt="Puzzle Piece"
                    className="absolute z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/80"
                    style={{
                        top: `${pieceY}px`,      // Y มาจาก Backend
                        left: `${sliderValue}px`, // X มาจาก Slider ที่ User ลาก
                        width: "50px",           // ต้องตรงกับ Backend
                        height: "50px",
                    }}
                />
            </div>

            {/* 2. Slider Control (วางข้างล่าง) */}
            <div className="mt-4 w-full">
                <p className="text-sm text-gray-500 mb-2 text-center">Drag the slider to fit the puzzle</p>
                <input
                    type="range"
                    min="0"
                    max={captchaWidth - 50}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    onMouseUp={handleVerify} // ปล่อยเมาส์แล้วส่งตรวจ
                    onTouchEnd={handleVerify} // สำหรับมือถือ
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    disabled={status === "Correct! 🎉"}
                />
            </div>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div className={`mt-2 font-semibold text-lg ${status.includes("Correct") ? "text-green-600" : "text-red-600"}`}>
          {status}
        </div>
      )}
    </div>
  );
}