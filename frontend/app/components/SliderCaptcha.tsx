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
  
  
  const [absoluteStartTime, setAbsoluteStartTime] = useState<number>(0); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [captchaWidth, setCaptchaWidth] = useState<number>(300); 
  const [captchaHeight, setCaptchaHeight] = useState<number>(150);
  const [isError, setIsError] = useState(false);

  const router = useRouter();

  
  useEffect(() => {
    setAbsoluteStartTime(Date.now());
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
      
      
    } catch (error) {
      console.error("Error loading captcha:", error);
      setStatus("Error loading captcha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isLoading) return;

    const durationTotal = Date.now() - absoluteStartTime;

    try {
      const res = await axios.post(
        "http://localhost:8080/api/slider/verify",
        {
          userId: userId,
          x: sliderValue, 
          timeTaken: durationTotal, // ส่งมิลลิวินาทีให้ Backend ตามเดิม
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

  return (
    <div className={`flex flex-col items-center gap-6 p-8 bg-white rounded-xl shadow-2xl max-w-md w-full ${isError ? "animate-shake border-red-500 border-2" : ""}`}>
      <h2 className="text-2xl font-bold text-gray-800">Slider Verification</h2>
      
      {isLoading && !bgImage ? (
        <div className="bg-gray-200 animate-pulse rounded flex items-center justify-center"
        style={{ width: `${captchaWidth}px`, height: `${captchaHeight}px` }}
        >
            Loading...
        </div>
      ) : (
        <div className="relative group">
            <div className="relative rounded-lg overflow-hidden shadow-inner border border-gray-300"
            style={{ width: `${captchaWidth}px`, height: `${captchaHeight}px` }}>
                
                {bgImage && (
                    <img 
                        src={bgImage} 
                        alt="Background" 
                        className="w-full h-full object-none" 
                    />
                )}

                <img
                    src={pieceImage}
                    alt="Puzzle Piece"
                    className="absolute z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                    style={{
                        top: `${pieceY}px`,      
                        left: `${sliderValue}px`, 
                        width: "70px",           
                        height: "70px",
                    }}
                />
            </div>

            <div className="mt-4 w-full">
                <p className="text-sm text-gray-500 mb-2 text-center">Drag the slider to fit the puzzle</p>
                <input
                    type="range"
                    min="0"
                    max={captchaWidth - 50}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    onMouseUp={handleVerify} 
                    onTouchEnd={handleVerify} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    disabled={status === "Correct! 🎉"}
                />
            </div>
        </div>
      )}

      {status && (
        <div className={`mt-2 font-semibold text-lg ${status.includes("Correct") ? "text-green-600" : "text-red-600"}`}>
          {status}
        </div>
      )}
    </div>
  );
}