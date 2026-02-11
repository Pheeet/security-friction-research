'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const refCode = searchParams.get('refCode');
  const router = useRouter();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId || '0'),
          otp: otp
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("OTP Verified!");
        router.push('/captcha');
      } else {
        alert("Incorrect OTP: " + (data.message || ""));
      }
    } catch (error) {
      alert("Error verifying OTP");
    }

    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f9f9f9' 
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
          Ref: <strong>{refCode}</strong>
        </p>

        <input 
          type="text" 
          placeholder="Enter 6-digit Code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
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
