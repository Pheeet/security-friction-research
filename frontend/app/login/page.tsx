'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// SVG Icons
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" style={{ marginRight: '10px' }}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.221,0-9.651-3.342-11.301-7.997l-6.573,4.825C9.653,39.661,16.316,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

const EyeIcon = ({ isVisible }: { isVisible: boolean }) => (
  isVisible ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: '20px', height: '20px'}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: '20px', height: '20px'}}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const absoluteStartTime = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [loginError, setLoginError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [firstKeystrokeTime, setFirstKeystrokeTime] = useState<number | null>(null);
  const [hasPasted, setHasPasted] = useState(false);
  const [experimentMode, setExperimentMode] = useState('static');

  const [mouseMoved, setMouseMoved] = useState(false);
  const [backspaceCount, setBackspaceCount] = useState(0);

  useEffect(() => {
    absoluteStartTime.current = Date.now();
    const mode = sessionStorage.getItem('experiment_mode');
    if (mode !== 'adaptive') {
      sessionStorage.setItem('experiment_mode', 'static');
      setExperimentMode('static');
      // ลบคุกกี้เก่าที่อาจค้างมาจากรอบก่อน
      document.cookie = "experiment_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    } else {
      setExperimentMode('adaptive');
    }

    const handleHumanInteraction = () => {
      setMouseMoved(true);
      // พอรู้ว่าเป็นคนแล้ว ก็ถอดเซ็นเซอร์ออกได้เลย
      window.removeEventListener('mousemove', handleHumanInteraction);
      window.removeEventListener('touchstart', handleHumanInteraction);
    };

    window.addEventListener('mousemove', handleHumanInteraction);
    window.addEventListener('touchstart', handleHumanInteraction);

    return () => {
      window.removeEventListener('mousemove', handleHumanInteraction);
      window.removeEventListener('touchstart', handleHumanInteraction);
    };

  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // จับเวลาเริ่มพิมพ์
    if (!firstKeystrokeTime) {
      setFirstKeystrokeTime(Date.now());
    }
    // นับจำนวนการกดปุ่มลบ (Backspace)
    if (e.key === 'Backspace') {
      setBackspaceCount(prev => prev + 1);
    }
  };

  const handlePaste = () => {
    setHasPasted(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsShaking(false);
    setIsLoading(true);

    setIsAnalyzing(true);
    
    const timeSpentMs = Date.now() - absoluteStartTime.current;

    const typingTimeMs = firstKeystrokeTime ? Date.now() - firstKeystrokeTime : 0;
    try {
        const res = await fetch('http://localhost:8080/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username, 
              password, 
              time_login: timeSpentMs,
              
              typing_time: typingTimeMs, 
              has_pasted: hasPasted,     
              experiment_mode: experimentMode,
              mouse_moved: mouseMoved,
              backspace_count: backspaceCount
            }),
        });
        
        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem('secure_user_id', data.user_id.toString());

            sessionStorage.setItem('require_2fa', data.require_2fa.toString());
            sessionStorage.setItem('captcha_type', data.captcha_type || ''); 
            sessionStorage.setItem('2fa_method', data.method || 'email');

            if (data.token) {
              document.cookie = `auth_token=${data.token}; path=/; max-age=86400`;
            }

            document.cookie = `experiment_mode=${experimentMode}; path=/; max-age=86400`;
            setIsLoading(false);
            setIsSuccess(true);

            setTimeout(() => {
                if (data.captcha_type === 'none' && data.require_2fa === false) {
                    router.push('/survey');
                } else {
                    router.push(`/security-checkpoint?userId=${data.user_id}&method=email`);
                }
            }, 1500);

        } else {
            setIsAnalyzing(false);
            setIsLoading(false); 
            setLoginError(data.error || 'Invalid credentials');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500); 
        }
    } catch (error) {
      setIsAnalyzing(false);
        setIsLoading(false);
        console.error("Login Error:", error);
        setLoginError('Cannot connect to server');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleGoogleLogin = () => {
    document.cookie = `experiment_mode=${experimentMode}; path=/; max-age=3600`;
    document.cookie = `sso_start_time=${absoluteStartTime.current}; path=/; max-age=3600`;
    window.location.href = "http://localhost:8080/api/auth/google/login";
  };

  const greenThemeColor = '#059669';

  const getFloatingInputStyle = (isFocused: boolean, hasIcon: boolean, hasError: boolean) => ({
    width: '100%',
    padding: hasIcon ? '22px 45px 6px 12px' : '22px 12px 6px 12px',
    borderRadius: '4px',
    border: `1px solid ${hasError ? '#ef4444' : (isFocused ? greenThemeColor : '#e0e0e0')}`, 
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    color: '#333',
    transition: 'border-color 0.3s'
  });

  const getFloatingLabelStyle = (isFocused: boolean, hasValue: boolean, hasError: boolean) => ({
    position: 'absolute' as const,
    left: '12px',
    top: isFocused || hasValue ? '8px' : '50%',
    transform: isFocused || hasValue ? 'none' : 'translateY(-50%)',
    fontSize: isFocused || hasValue ? '0.75rem' : '1rem',
    color: hasError ? '#ef4444' : (isFocused ? greenThemeColor : '#9ca3af'), 
    transition: 'all 0.2s ease-in-out',
    pointerEvents: 'none' as const,
  });

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800 font-bold text-lg mb-2">Analyzing login behavior...</p>
          <p className="text-gray-500 text-sm">กำลังวิเคราะห์พฤติกรรมเพื่อความปลอดภัยของคุณ</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
      
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

      <div style={{ backgroundColor: '#ffffff', padding: '3.5rem', borderRadius: '10px', width: '100%', maxWidth: '520px', color: '#333', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 'bold' }}>Login</h1>

        <button type="button" onClick={handleGoogleLogin} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#ffffff', color: '#333', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleIcon /> Sign in with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', color: '#e0e0e0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
          <span style={{ margin: '0 10px', fontSize: '0.9rem', color: '#999' }}>Or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
        </div>
        
        <form 
          onSubmit={handleLogin} 
          className={isShaking ? 'animate-shake' : ''} 
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          
          <div style={{ position: 'relative', width: '100%', textAlign: 'left' }}>
            <input 
              type="text" 
              value={username} 
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onChange={(e) => {
                  setUsername(e.target.value);
                  setLoginError('');
              }} 
              style={getFloatingInputStyle(focusedField === 'username', false, !!loginError)} 
            />
            <label style={getFloatingLabelStyle(focusedField === 'username', username.length > 0, !!loginError)}>
              Username
            </label>
          </div>
          
          <div style={{ position: 'relative', width: '100%', textAlign: 'left', marginTop: '-0.5rem' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(''); 
              }} 
              style={getFloatingInputStyle(focusedField === 'password', true, !!loginError)} 
            />
            <label style={getFloatingLabelStyle(focusedField === 'password', password.length > 0, !!loginError)}>
              Password
            </label>
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'
                }}
              >
                <EyeIcon isVisible={showPassword} />
            </button>
          </div>

          {/* 🔥 ส่วนที่ปรับปรุง: แก้ไขข้อความ Error ให้ซอฟต์ลง และจัดเลย์เอาต์เผื่อขึ้นบรรทัดใหม่ */}
          {loginError && (
            <div style={{ 
                color: '#ef4444', 
                fontSize: '0.85rem', 
                display: 'flex', 
                alignItems: 'flex-start', // ให้ไอคอนอยู่ชิดด้านบน (เผื่อข้อความยาว 2 บรรทัด)
                gap: '6px', 
                textAlign: 'left', 
                marginTop: '-12px',
                lineHeight: '1.4' // เพิ่มระยะห่างบรรทัดให้อ่านง่าย
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{width: '16px', height: '16px', marginTop: '2px', flexShrink: 0}}>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>
                {/* ดักจับ Error จาก Backend เพื่อเปลี่ยนเป็นประโยคที่ UX ดีกว่า */}
                {loginError === "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" || loginError === "Invalid credentials" 
                    ? "We couldn't find an account matching the username and password you entered." 
                    : loginError}
              </span>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading || isSuccess} 
            style={{ 
                padding: '12px', 
                borderRadius: '4px', 
                border: 'none', 
                backgroundColor: isSuccess ? '#10b981' : greenThemeColor, 
                color: 'white', 
                fontSize: '1.2rem', 
                fontWeight: 'bold', 
                cursor: (isLoading || isSuccess) ? 'not-allowed' : 'pointer', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', border: '3px solid rgba(255, 255, 255, 0.3)', borderTop: '3px solid #ffffff', borderRadius: '50%', animation: 'spin-circle 1s linear infinite' }} />
                    <span>Logging in...</span>
                </div>
            ) : isSuccess ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span> Login Successful
                </div>
            ) : (
                'Log In'
            )}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#555' }}><input type="checkbox" style={{ marginRight: '5px' }} /> Remember me</label>
          <a href="#" style={{ color: greenThemeColor, textDecoration: 'none' }}>Forgot Password?</a>
        </div>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#999' }}>
            Don't have an account? <Link href="/register" style={{ color: greenThemeColor, textDecoration: 'none', fontWeight: 'bold' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}