//app/2fa/challenge/page/tsx
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('Loading...');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [isSuccess, setIsSuccess] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const initialRefCode = searchParams.get('refCode');
  const method = searchParams.get('method') || 'email';
  const [currentRefCode, setCurrentRefCode] = useState(initialRefCode);
  const [startTime, setStartTime] = useState<number>(0);

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('secure_user_id');
    if (!storedUserId) {
      alert("Session expired. Please login again.");
      router.push('/login');
      return;
    }
    setUserId(storedUserId);
  }, [router]);
  
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/user/${userId}`);
        const data = await res.json();
        if (res.ok && data.email) {
          setUserEmail(data.email);
        } else {
          setUserEmail('your email');
        }
      } catch (error) {
        console.error("Error fetching user email:", error);
        setUserEmail('your email');
      }
    };

    fetchUserEmail();
  }, [userId]);
  
  useEffect(() => {
    setStartTime(Date.now());
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerifyOTP = async (codeToVerify?: string) => {
    const finalOtp = codeToVerify || otpValues.join('');

    if (finalOtp.length < 6) return;
    if (loading || isSuccess) return;
    // เคลียร์ Error ก่อนเริ่มโหลด
    setOtpError('');
    setIsShaking(false);
    setLoading(true);

    const timeTakenMs = Date.now() - startTime; 
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: parseInt(userId || '0', 10),
          otp: finalOtp, 
          time_taken: timeTakenMs
        }),
      });

      const data = await res.json();

      if (data.success) {
        
        if (data.token) {
          document.cookie = `auth_token=${data.token}; path=/; max-age=86400`;
        }

        setLoading(false);
        setIsVerifying(true);
        setIsSuccess(true);
        setTimeout(() => {
            router.push('/survey'); 
        }, 2000);

      } else {
       
        setLoading(false);
        setOtpError(data.message || "Incorrect OTP. Please try again.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        setOtpValues(['', '', '', '', '', '']); 
        inputRefs.current[0]?.focus(); 
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      setOtpError("Unable to connect to server");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleResend = async () => {
    setOtpError('');
    setLoading(true);
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/2fa/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId || '0', 10),
          method: method 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRefCode(data.ref_code);
        const newUrl = `/2fa/challenge?method=${method}&refCode=${data.ref_code}`;
        router.replace(newUrl);
        setOtpValues(['', '', '', '', '', '']);
        setCountdown(30); 
        inputRefs.current[0]?.focus();

      }
    } catch (error) {
      setOtpError("Error sending new OTP. Please try again.");
    }
    setLoading(false);
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); 
    if (!value) return;

    setOtpError(''); // พิมพ์ใหม่ปุ๊บ เอา Error ออก

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1); 
    setOtpValues(newOtpValues);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

  
    const currentOtp = newOtpValues.join('');
    if (currentOtp.length === 6) {
        handleVerifyOTP(currentOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      setOtpError('');
      if (!otpValues[index] && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    } else if (e.key === 'Enter') {
      // ป้องกันไม่ให้ปุ่ม Enter ทำงาน (บังคับให้ระบบ Auto-check จาก handleChange หรือ handlePaste แทน)
      e.preventDefault(); 
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setOtpError('');
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData) {
      const newOtpValues = [...otpValues];
      for (let i = 0; i < pastedData.length; i++) {
        newOtpValues[i] = pastedData[i];
      }
      setOtpValues(newOtpValues);
      
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();

      // วางรหัส 6 ตัวปุ๊บ วิ่งเช็คให้อัตโนมัติ
      if (pastedData.length === 6) {
          handleVerifyOTP(pastedData);
      }
    }
  };

  const greenThemeColor = '#059669'; 

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800 font-bold text-lg mb-2">Authentication Successful</p>
          <p className="text-gray-500 text-sm">ยืนยันตัวตนสำเร็จ กำลังพาท่านไปยังแบบสอบถาม</p>
        </div>
      </div>
    );
}

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      
      
      <style>{`
        @keyframes spin-circle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div style={{ backgroundColor: '#fff', padding: '3.5rem', borderRadius: '12px', width: '100%', maxWidth: '480px', textAlign: 'left', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <h1 style={{ color: '#111827', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Verify OTP
        </h1>

        <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: '1.6' }}>
          We sent an OTP to <strong>{userEmail}</strong><br/>
          Enter it below to continue.<br/>
          <span style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '4px', display: 'block' }}>Ref: {currentRefCode}</span>
        </p>

        
        <div className={isShaking ? 'animate-shake' : ''} style={{ marginBottom: otpError ? '0.5rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
            {otpValues.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code" 
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                style={{
                  width: '50px',
                  height: '60px',
                  fontSize: '1.5rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: otpError ? '#ef4444' : '#111827', // ถ้าผิด ตัวเลขจะแดง
                  border: `1px solid ${otpError ? '#ef4444' : '#d1d5db'}`, // ถ้าผิด กรอบจะแดง
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = otpError ? '#ef4444' : greenThemeColor;
                  e.target.style.boxShadow = otpError ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : `0 0 0 3px rgba(5, 150, 105, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = otpError ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>
        </div>

       
        {otpError && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{width: '16px', height: '16px'}}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {otpError}
          </div>
        )}

        <div style={{ fontSize: '0.95rem', color: '#4b5563', marginBottom: '2rem' }}>
          {countdown > 0 ? (
            <span>
              Resend available in 00:{countdown.toString().padStart(2, '0')} seconds.{' '}
              <span style={{ color: '#9ca3af', fontWeight: '500' }}>Resend OTP</span>
            </span>
          ) : (
            <span>
              Resend available:{' '}
              <button onClick={handleResend} style={{ background: 'none', border: 'none', color: greenThemeColor, fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '0.95rem' }}>
                Resend OTP
              </button>
            </span>
          )}
        </div>

        
        <button 
          onClick={() => handleVerifyOTP()}
          disabled={loading || isSuccess || otpValues.join('').length < 6}
          style={{ 
            width: '100%', padding: '14px', 
            backgroundColor: (loading || otpValues.join('').length < 6) && !isSuccess ? '#9ca3af' : (isSuccess ? '#10b981' : greenThemeColor), 
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', 
            cursor: loading || isSuccess || otpValues.join('').length < 6 ? 'not-allowed' : 'pointer',
            transition: 'background-color 3s',
            marginBottom: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', border: '3px solid rgba(255, 255, 255, 0.3)', borderTop: '3px solid #ffffff', borderRadius: '50%', animation: 'spin-circle 1s linear infinite' }} />
                  <span>Verifying...</span>
              </div>
          ) : isSuccess ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span> Verified Successfully
              </div>
          ) : (
              'Verify'
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto' }}
          >
            ← Back to Log In
          </button>
        </div>

      </div>
    </div>
  );
}

export default function TwoFAChallengePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChallengeContent />
    </Suspense>
  );
}