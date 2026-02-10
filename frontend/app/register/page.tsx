'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: ''
  });

  // ฟังก์ชันอัปเดต State เวลาพิมพ์
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation ฝั่ง Frontend
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน (Passwords do not match)");
      return;
    }

    // 2. ส่งข้อมูลไป Backend
    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          fullname: formData.fullname,
          email: formData.email
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message); // แจ้งเตือนสำเร็จ
        router.push('/login'); // เด้งไปหน้า Login
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก'); // แจ้งเตือน Error จาก Backend
      }
    } catch (error) {
      console.error('Error:', error);
      alert('ไม่สามารถเชื่อมต่อกับ Server ได้');
    }
  };

  // สไตล์สำหรับ Input (จะได้ไม่ต้องเขียนซ้ำ)
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
        maxWidth: '520px', // Register box width
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
      }}>
        
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center', color: '#111827' }}>
          Create Account
        </h1>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* ชื่อ-นามสกุล */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Full Name</label>
            <input 
              type="text" name="fullname" placeholder="John Doe" required
              value={formData.fullname} onChange={handleChange} style={inputStyle}
            />
          </div>

          {/* อีเมล */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Email Address</label>
            <input 
              type="email" name="email" placeholder="john@example.com" required
              value={formData.email} onChange={handleChange} style={inputStyle}
            />
          </div>

          {/* ชื่อผู้ใช้ */}
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Username</label>
            <input 
              type="text" name="username" placeholder="Username" required
              value={formData.username} onChange={handleChange} style={inputStyle}
            />
          </div>
          
          {/* รหัสผ่าน และ ยืนยันรหัสผ่าน (วางคู่กันถ้าจอใหญ่ หรือเรียงลงมา) */}
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}> 
             <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Password</label>
                <input 
                  type="password" name="password" placeholder="Password" required
                  value={formData.password} onChange={handleChange} style={inputStyle}
                />
             </div>
             <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Confirm Password</label>
                <input 
                  type="password" name="confirmPassword" placeholder="Confirm Password" required
                  value={formData.confirmPassword} onChange={handleChange} style={inputStyle}
                />
             </div>
          </div>

          {/* ปุ่ม Submit */}
          <button 
            type="submit" 
            style={{ 
              padding: '14px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: '#10b981', // สีเขียว Theme เดียวกัน
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