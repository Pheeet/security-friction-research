'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('http://localhost:8080/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      alert('Login สำเร็จ!');
      router.push('/');
    } else {
      alert('Login ไม่สำเร็จ');
    }
  };

  return (
    // 1. พื้นหลังหน้าเว็บ
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f9fafb' 
    }}>
      
      {/* 2. ตัวการ์ด */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '3rem', 
        borderRadius: '12px', 
        width: '100%', 
        maxWidth: '420px', 
        color: '#333', 
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)' 
      }}>
        
        {/* หัวข้อ Login */}
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: '2rem', 
          fontWeight: 'bold',
          color: '#111827' 
        }}>
          Login
        </h1>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Input Username */}
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              borderRadius: '6px', 
              border: '1px solid #e5e7eb', 
              backgroundColor: '#ffffff',
              fontSize: '1rem',
              color: '#333',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          
          {/* Input Password */}
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              borderRadius: '6px', 
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              fontSize: '1rem',
              color: '#333',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />

          {/* ปุ่ม Login */}
          <button 
            type="submit" 
            style={{ 
              padding: '12px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: '#10b981', 
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            Log In
          </button>
        </form>

        {/* ส่วน Remember me & Forget password */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1.5rem', 
          fontSize: '0.9rem',
          color: '#6b7280'
        }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" style={{ marginRight: '8px', accentColor: '#10b981' }} /> 
            Remember me
          </label>
          <a href="#" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>
            Forgot Password?
          </a>
        </div>

        {/* --- [ส่วนที่เพิ่มใหม่] Sign Up Link --- */}
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Don't have an account?{' '}
            <a href="/register" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>
                Sign up
            </a>
        </div>

      </div>
    </div>
  );
}