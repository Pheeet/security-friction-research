//components/SliderCaptcha.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";


interface Props {
  userId: string;
  onSuccess?: () => void;
}


export default function SliderCaptcha({ userId, onSuccess }: Props) {
  const [bgImage, setBgImage] = useState<string>("");
  const [pieceImage, setPieceImage] = useState<string>("");
  const [pieceY, setPieceY] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  
  
  const absoluteStartTime = useRef<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [captchaWidth, setCaptchaWidth] = useState<number>(300); 
  const [captchaHeight, setCaptchaHeight] = useState<number>(150);
  const [isError, setIsError] = useState(false);
  const [actualWidth, setActualWidth] = useState<number>(300);

  const containerRef = useRef<HTMLDivElement>(null);
  const [renderScale, setRenderScale] = useState(1);

  const router = useRouter();

  const hasFetched = useRef(false);

  const ORIGINAL_WIDTH = 300;
  const ORIGINAL_PIECE_SIZE = 70;

  useEffect(() => {
    if (!hasFetched.current) {
      
      absoluteStartTime.current = Date.now(); 
      fetchCaptcha();
      hasFetched.current = true;
    }

    const updateScale = () => {
      if (containerRef.current) {
        const actualWidth = containerRef.current.offsetWidth;
        setRenderScale(actualWidth / ORIGINAL_WIDTH);
      }
    };

    window.addEventListener("resize", updateScale);
    updateScale(); // รันครั้งแรก
    return () => window.removeEventListener("resize", updateScale);

  }, []);

  

  const fetchCaptcha = async () => {
    setIsLoading(true);
    setStatus(null);
    setSliderValue(0);
    try {
      // เติม &t=${Date.now()} เข้าไปต่อท้ายครับ 👇
      const res = await axios.get(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/slider?userId=${userId}&t=${Date.now()}`, {
        withCredentials: true,
      });
      setBgImage(res.data.originalImage);
      setPieceImage(res.data.puzzlePiece);
      setPieceY(res.data.y);
      
    } catch (error) {
      console.error("Error loading captcha:", error);
      setStatus("Error loading captcha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isLoading || status === "Correct! 🎉") return;

    const durationTotal = Date.now() - absoluteStartTime.current;
    

    try {
      const res = await axios.post(
        `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/slider/verify`,
        {
          userId: userId,
          x: Math.round(sliderValue), 
          timeTaken: durationTotal, 
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        
        setStatus("Correct! 🎉");
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/survey");
          }
        }, 1500);
      } else {
        setStatus("Incorrect! ❌");
        setIsError(true);
        setTimeout(() => setIsError(false), 400);
        setTimeout(() => {
            fetchCaptcha();
        }, 1000);
      }
    } catch (error) {
      console.error("Verify error:", error);
      setStatus("Error verifying");
    }
  };

  const visualPieceSize = ORIGINAL_PIECE_SIZE * renderScale;
  const visualTop = pieceY * renderScale;
  // คำนวณตำแหน่ง Left: (เปอร์เซ็นต์ / 100) * (ความกว้างคอนเทนเนอร์ - ขนาดชิ้นส่วน)
  const visualLeft = containerRef.current 
    ? (sliderValue / 100) * (containerRef.current.offsetWidth - visualPieceSize)
    : 0;

  return (
    <div className={`flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-2xl max-w-md w-full ${isError ? "animate-shake border-red-500 border-2" : ""}`}>
      <h2 className="text-2xl font-bold text-gray-800">Slider Verification</h2>
      
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg border border-gray-300 shadow-inner bg-gray-100">
        {isLoading && !bgImage ? (
          <div className="aspect-[2/1] w-full animate-pulse flex items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : (
          <>
            {/* พื้นหลัง: ใช้ w-full เพื่อให้ยืดหดตามจอ */}
            <img src={bgImage} alt="Background" className="w-full h-auto block select-none" />

            {/* ชิ้นส่วน: ขนาดและตำแหน่งต้องคูณ scaleFactor */}
            <img
              src={pieceImage}
              alt="Puzzle Piece"
              className="absolute z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none"
              style={{
                top: `${visualTop}px`,
                left: `${visualLeft}px`,
                width: `${visualPieceSize}px`,
                height: `${visualPieceSize}px`,
              }}
            />
          </>
        )}
      </div>

      <div className="w-full">
        <p className="text-sm text-gray-500 mb-4 text-center">เลื่อนจิ๊กซอว์ให้ลงล็อค</p>
        <input
          type="range"
          min="0"
          max="100" // ⭐️ ใช้เปอร์เซ็นต์เสมอ 0-100
          step="1"
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          onMouseUp={handleVerify}
          onTouchEnd={handleVerify}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          disabled={status === "Correct! 🎉"}
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