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
  const [captchaId, setCaptchaId] = useState<string>(""); // 🛡️ Added: Store CaptchaID
  const [bgImage, setBgImage] = useState<string>("");
  const [pieceImage, setPieceImage] = useState<string>("");
  const [pieceY, setPieceY] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  
  const absoluteStartTime = useRef<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // 📏 Alignment States
  const [backendWidth, setBackendWidth] = useState<number>(300);
  const [backendPieceSize, setBackendPieceSize] = useState<number>(70);

  const containerRef = useRef<HTMLDivElement>(null);
  const [renderScale, setRenderScale] = useState(1);

  const router = useRouter();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      absoluteStartTime.current = Date.now(); 
      fetchCaptcha();
      hasFetched.current = true;
    }

    const updateScale = () => {
      if (containerRef.current) {
        const actualWidth = containerRef.current.offsetWidth;
        // 📏 Align scale with whatever width the backend sent
        setRenderScale(actualWidth / backendWidth);
      }
    };

    window.addEventListener("resize", updateScale);
    updateScale();
    return () => window.removeEventListener("resize", updateScale);
  }, [backendWidth]);

  const fetchCaptcha = async () => {
    setIsLoading(true);
    setStatus(null);
    setSliderValue(0);
    try {
      const res = await axios.get(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/slider?userId=${userId}&t=${Date.now()}`, {
        withCredentials: true,
      });
      setCaptchaId(res.data.captchaId); // 🛡️ Store unique ID
      setBgImage(res.data.originalImage);
      setPieceImage(res.data.puzzlePiece);
      setPieceY(res.data.y);
      setBackendWidth(res.data.width || 300);
      setBackendPieceSize(res.data.pieceSize || 70);
      
    } catch (error) {
      console.error("Error loading captcha:", error);
      setStatus("Error loading captcha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isLoading || status === "Correct! 🎉" || !captchaId) return;

    const durationTotal = Date.now() - absoluteStartTime.current;

    try {
      const res = await axios.post(
        `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/slider/verify`,
        {
          captchaId: captchaId, // 🛡️ Send unique ID
          userId: userId,
          x: sliderValue, // Sending percentage directly
          timeTaken: durationTotal, 
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        setStatus("Correct! 🎉");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          else router.push("/survey");
        }, 1500);
      } else {
        setStatus("Incorrect! ❌");
        setIsError(true);
        setTimeout(() => setIsError(false), 400);
        setTimeout(() => fetchCaptcha(), 1000);
      }
    } catch (error) {
      console.error("Verify error:", error);
      setStatus("Error verifying");
    }
  };

  const visualPieceSize = backendPieceSize * renderScale;
  const visualTop = pieceY * renderScale;
  
  // 📏 Calculate visual offset precisely using percentages
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