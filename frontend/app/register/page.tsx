'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. อ่านค่าจาก query parameter
  const provider = searchParams.get('provider');
  const emailFromGoogle = searchParams.get('email');
  
  // 🔥 จุดที่แก้: เปลี่ยนจาก 'name' เป็น 'fullname'
  const nameFromGoogle = searchParams.get('fullname'); 

  const isGoogleRegister = provider === 'google';

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: ''
  });

  // 2. เติมค่าจาก Google ถ้ามี
  useEffect(() => {
    if (isGoogleRegister) {
      // ตรวจสอบว่ามีค่าจริงๆ ถึงจะเซ็ต
      setFormData(prev => ({
        ...prev,
        email: emailFromGoogle || '',
        fullname: nameFromGoogle || '', // ตอนนี้ค่าจะมาแล้วครับ
        username: emailFromGoogle?.split('@')[0] || ''
      }));
    }
  }, [isGoogleRegister, emailFromGoogle, nameFromGoogle]);

  // อัปเดต State เวลาพิมพ์
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน (Passwords do not match)");
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          // ถ้าเป็น Google แต่ไม่มีชื่อ (กรณีแปลกๆ) ให้ส่งค่าว่างไป หรือส่งค่าที่ user พิมพ์เอง
          fullname: formData.fullname, 
          email: formData.email,
          provider: isGoogleRegister ? "google" : "local"
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        router.push('/login');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('ไม่สามารถเชื่อมต่อกับ Server ได้');
    }
  };

  const inputStyle = {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    color: '#333'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '3rem', 
        borderRadius: '12px', 
        width: '100%', 
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
      }}>
        
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center', color: '#111827' }}>
          Create Account
        </h1>

        {isGoogleRegister && (
          <p style={{ textAlign: 'center', color: '#10b981', marginBottom: '1rem' }}>
            Signing up with Google
          </p>
        )}
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* 🔥 คำแนะนำเพิ่มเติม: 
             แม้จะมาจาก Google แต่ถ้า 'fullname' ว่าง (บางที Google ไม่ส่งมา) 
             เราควรเปิดช่อง Input ให้ User กรอกเองได้ครับ 
             
             เปลี่ยนเงื่อนไขจาก !isGoogleRegister เป็น (!isGoogleRegister || !formData.fullname)
             แต่ถ้าเอาชัวร์ แค่แก้บรรทัด get('fullname') ด้านบนก็น่าจะผ่านแล้วครับ
          */}

          {/* Full Name */}
          {!isGoogleRegister && (
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Full Name</label>
              <input 
                type="text"
                name="fullname"
                placeholder="John Doe"
                required
                value={formData.fullname}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          )}

          {/* Email */}
          {!isGoogleRegister && (
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Email Address</label>
              <input 
                type="email"
                name="email"
                placeholder="john@example.com"
                required
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          )}

          {/* Username */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Username</label>
            <input 
              type="text"
              name="username"
              placeholder="Username"
              required
              value={formData.username}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          
          {/* Password */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Password</label>
            <input 
              type="password"
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Confirm Password</label>
            <input 
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            style={{ 
              padding: '14px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '1rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            Register
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
          Already have an account? <a href="/login" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>Log in</a>
        </div>

      </div>
    </div>
  );
}