'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const provider = searchParams.get('provider');
  const emailFromGoogle = searchParams.get('email');
  const nameFromGoogle = searchParams.get('fullname'); 
  const isGoogleRegister = provider === 'google';

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    email: ''
  });

  const [errors, setErrors] = useState({
    fullname: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (isGoogleRegister) {
      setFormData(prev => ({
        ...prev,
        email: emailFromGoogle || '',
        fullname: nameFromGoogle || '', 
        username: emailFromGoogle?.split('@')[0] || ''
      }));
    }
  }, [isGoogleRegister, emailFromGoogle, nameFromGoogle]);

  const checkAvailability = async (field: string, value: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/check-availability?${field}=${value}`);
      const data = await res.json();
      if (!data.available) {
        // แปลข้อความจาก Backend หรือใช้ข้อความภาษาอังกฤษตรงนี้แทน
        const msg = field === 'username' ? 'Username is already taken' : 'Email is already taken';
        setErrors(prev => ({ ...prev, [field]: msg }));
      }
    } catch (err) {
      console.error("Check availability error", err);
    }
  };

  const getFieldError = (name: string, value: string, allData: typeof formData) => {
    let errorMsg = '';
    
    switch (name) {
      case 'fullname':
        if (!value.trim()) errorMsg = 'Full Name is required';
        break;

      case 'email':
        if (!value.trim()) errorMsg = 'Email Address is required';
        else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          errorMsg = 'Invalid email format';
        }
        break;

      case 'username':
        if (!value.trim()) errorMsg = 'Username is required';
        else if (/\s/.test(value)) errorMsg = 'Username cannot contain spaces';
        else if (value.length < 4) errorMsg = 'Username must be at least 4 characters';
        break;

      case 'password':
        const hasMinLen = value.length >= 8;
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        if (!hasMinLen || !hasUpper || !hasLower || !hasNumber) {
          errorMsg = 'Password must be 8+ chars, with Uppercase, Lowercase, and Number';
        }
        break;

      case 'confirmPassword':
        // 🔥 แก้ไข: เพิ่มเช็คว่าห้ามว่างด้วย
        if (!value.trim()) {
            errorMsg = 'Please confirm your password';
        } else if (value !== allData.password) {
            errorMsg = 'Passwords do not match';
        }
        break;
    }
    return errorMsg;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    const errorMsg = getFieldError(name, value, newFormData);
    setErrors(prev => ({ ...prev, [name]: errorMsg }));

    // ถ้าแก้ Password ต้องเช็ก Confirm Password ใหม่ด้วยเสมอ
    if (name === 'password') {
        // ส่ง newFormData เข้าไปเพื่อให้มันเช็คกับ Password ตัวใหม่ล่าสุด
        const confirmError = getFieldError('confirmPassword', newFormData.confirmPassword, newFormData);
        setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    const errorMsg = getFieldError(name, value, formData);
    if (errorMsg) {
        setErrors(prev => ({ ...prev, [name]: errorMsg }));
        return; 
    }

    if (name === 'email' || name === 'username') {
        checkAvailability(name, value);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
        fullname: getFieldError('fullname', formData.fullname, formData),
        email: !isGoogleRegister ? getFieldError('email', formData.email, formData) : '',
        username: getFieldError('username', formData.username, formData),
        password: getFieldError('password', formData.password, formData),
        confirmPassword: getFieldError('confirmPassword', formData.confirmPassword, formData),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(x => x !== '')) {
        return; 
    }

    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          fullname: formData.fullname, 
          email: formData.email,
          provider: isGoogleRegister ? "google" : "local"
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Registration Successful');
        router.push('/login');
      } else {
        alert(data.message || data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Cannot connect to server');
    }
  };

  const isButtonDisabled = Object.values(errors).some(err => err !== '');

  const inputStyle = (hasError: boolean): CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '6px',
    border: `1px solid ${hasError ? '#ef4444' : '#e5e7eb'}`,
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    color: '#333'
  });

  const errorTextStyle: CSSProperties = {
    color: '#ef4444', 
    fontSize: '0.85rem', 
    marginTop: '5px',
    textAlign: 'left' as const
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '3rem', borderRadius: '12px', width: '100%', maxWidth: '550px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center', color: '#111827' }}>
          Create Account
        </h1>

        {isGoogleRegister && <p style={{ textAlign: 'center', color: '#10b981', marginBottom: '1rem' }}>Signing up with Google</p>}
        
        <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {!isGoogleRegister && (
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Full Name</label>
              <input 
                type="text" name="fullname" placeholder="John Doe"
                value={formData.fullname}
                onChange={handleChange}
                onBlur={handleBlur}
                style={inputStyle(!!errors.fullname)}
              />
              {errors.fullname && <p style={errorTextStyle}>{errors.fullname}</p>}
            </div>
          )}

          {!isGoogleRegister && (
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Email Address</label>
              <input 
                type="email" name="email" placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                style={inputStyle(!!errors.email)}
              />
              {errors.email && <p style={errorTextStyle}>{errors.email}</p>}
            </div>
          )}

          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Username</label>
            <input 
              type="text" name="username" placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle(!!errors.username)}
            />
            {errors.username && <p style={errorTextStyle}>{errors.username}</p>}
          </div>
          
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Password</label>
            <input 
              type="password" name="password" placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={inputStyle(!!errors.password)}
            />
            {errors.password && <p style={errorTextStyle}>{errors.password}</p>}
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Confirm Password</label>
            <input 
              type="password" name="confirmPassword" placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={inputStyle(!!errors.confirmPassword)}
            />
            {errors.confirmPassword && <p style={errorTextStyle}>{errors.confirmPassword}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isButtonDisabled} 
            onMouseOver={() => setIsHovering(true)}
            onMouseOut={() => setIsHovering(false)}
            style={{ 
              padding: '14px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: isButtonDisabled 
                  ? '#9ca3af' 
                  : isHovering ? '#059669' : '#10b981',
              color: 'white', 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer', 
              marginTop: '1rem',
              transition: 'background-color 0.2s'
            }}
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