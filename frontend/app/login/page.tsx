'use client';

// 🔥 1. เพิ่ม useEffect เข้ามาใน import
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// SVG Icons... (คงเดิม)
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" style={{ marginRight: '10px' }}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.221,0-9.651-3.342-11.301-7.997l-6.573,4.825C9.653,39.661,16.316,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // 🔥 2. State สำหรับจับเวลา
  const [startTime, setStartTime] = useState<number>(0);

  // 🔥 3. เริ่มจับเวลาเมื่อโหลดหน้าเสร็จ
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        const res = await fetch('http://localhost:8080/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // 🔥 4. คำนวณเวลาและบันทึกลง sessionStorage ทันทีที่ Login สำเร็จ
            const endTime = Date.now();
            const timeSpent = (endTime - startTime) / 1000;
            sessionStorage.setItem('time_login', timeSpent.toString());

            // --- จุดสำคัญ: เช็คว่า Backend สั่งให้ทำ 2FA ไหม ---
            if (data.require_2fa) {
                router.push(`/2fa/challenge?userId=${data.user_id}&method=${data.method}&refCode=${data.ref_code}`);
            } else {
                // ⚠️ ข้อควรระวังสำหรับงานวิจัย: ถ้าไม่บังคับ 2FA User คนนี้จะไม่ถูกส่งไปทำ CAPTCHA ต่อ (ตาม Flow ที่ตั้งไว้)
                // ถ้าอยากบังคับให้ทุกคนไป CAPTCHA อาจจะต้องเปลี่ยน router.push('/') เป็น router.push('/captcha') แทนครับ
                document.cookie = "is-logged-in=true; path=/; max-age=3600";
                alert('Login สำเร็จ!');
                router.push('/captcha');
            }
        } else {
            alert(data.error || 'Login ไม่สำเร็จ');
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
    }
  };

  const handleGoogleLogin = () => {
    // ⚠️ หมายเหตุ: การ Login ด้วย Google ผ่าน window.location.href จะทำให้การจับเวลาด้วยวิธีนี้คลาดเคลื่อนได้
    // เพราะเป็นการสลับหน้าเว็บไปที่ระบบของ Google ถ้าต้องการเน้นเก็บเวลาชัวร์ๆ แนะนำให้ User กลุ่มทดสอบใช้การพิมพ์ Login ปกติครับ
    window.location.href = "http://localhost:8080/api/auth/google/login";
  };

  // Styles... (คงเดิม)
  const inputStyle = {
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    color: '#333'
  };
  const greenThemeColor = '#059669';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
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
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ padding: '12px', borderRadius: '4px', border: 'none', backgroundColor: greenThemeColor, color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>Log In</button>
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