//app/2fa/challenge
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const initialRefCode = searchParams.get('refCode');
  const method = searchParams.get('method') || 'email';
  const [currentRefCode, setCurrentRefCode] = useState(initialRefCode);
  // State สำหรับจับเวลา
  const [startTime, setStartTime] = useState<number>(0);

  // เริ่มจับเวลาทันทีที่หน้าโหลดเสร็จและพร้อมให้กรอก
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    setLoading(true);
    const timeTakenMs = Date.now() - startTime;
    try {
      const res = await fetch('http://localhost:8080/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: parseInt(userId || '0', 10),
          otp: otp,
          time_taken: timeTakenMs
        }),
      });

      const data = await res.json();

      if (data.success) {
        // คำนวณเวลาที่ใช้ในหน้า 2FA และบันทึกลง sessionStorage
        sessionStorage.setItem('time_2fa', (timeTakenMs / 1000).toString());

        alert("OTP Verified!");
        router.push('/survey'); // go to captcha
      } else {
        alert("Incorrect OTP: " + (data.message || "Please try again"));
        setOtp('');
      }
    } catch (error) {
      console.error(error);
      alert("Error verifying OTP: Unable to connect to server");
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/2fa/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId || '0', 10),
          method: method // หรือดึงจาก searchParams
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRefCode(data.ref_code);
        alert("รหัสใหม่ถูกส่งไปยังอีเมลของคุณแล้ว (Ref: " + data.ref_code + ")");
      }
    } catch (error) {
      alert("ไม่สามารถส่งรหัสใหม่ได้ กรุณาลองใหม่อีกครั้ง");
    }
    setLoading(false);
  };
  

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f3f4f6' 
    }}>
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '3rem', 
        borderRadius: '12px', 
        width: '100%', 
        maxWidth: '450px', 
        textAlign: 'center', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
      }}>
        
        <h1 style={{ 
          color: '#555', 
          fontSize: '1.8rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem' 
        }}>
          Email Verification
        </h1>

        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>

        <p style={{ color: '#999', marginBottom: '1.5rem' }}>
          We sent a 6-digit code to your email.<br/>
          Ref: <strong>{currentRefCode}</strong>
        </p>

        <input 
          type="text" 
          placeholder="Enter 6-digit Code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown} // เพิ่มกด Enter
          maxLength={6}
          style={{ 
            color: '#999',
            width: '100%', 
            padding: '12px', 
            textAlign: 'center', 
            fontSize: '1.2rem', 
            letterSpacing: '6px', 
            marginBottom: '1rem', 
            border: '1px solid #ddd', 
            borderRadius: '6px' 
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />

        <button 
          onClick={handleVerifyOTP}
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: loading ? '#999' : '#059669', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '1rem', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={handleResend}
            disabled={loading}
            style={{ 
              background: 'none',
              border: 'none',
              color: '#2563eb',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Didn't get the code? Resend
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