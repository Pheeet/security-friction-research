'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RegisterForm() {
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
  const [startTime, setStartTime] = useState<number>(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setStartTime(Date.now());
  }, []);

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
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/check-availability?${field}=${value}`);
      const data = await res.json();
      if (!data.available) {
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
        else if (value.length < 2 || value.length > 50) errorMsg = 'Full Name must be between 2 and 50 characters';
        else if (!/^[a-zA-Zก-๙\s\-']+$/.test(value)) errorMsg = 'Name can only contain letters, spaces, hyphens, and apostrophes';
        break;
      case 'email':
        if (!value.trim()) errorMsg = 'Email Address is required';
        else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) errorMsg = 'Invalid email format';
        break;
      case 'username':
        if (!value.trim()) errorMsg = 'Username is required';
        else if (value.length < 4 || value.length > 20) errorMsg = 'Username must be between 4 and 20 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) errorMsg = 'Username can only contain English letters, numbers, and underscores';
        break;
      case 'password':
        if (value.length < 8 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
          errorMsg = 'Password does not meet minimum requirements';
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) errorMsg = 'Please confirm your password';
        else if (value !== allData.password) errorMsg = 'Passwords do not match';
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

    if (name === 'password') {
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
    if (name === 'email' || name === 'username') checkAvailability(name, value);
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

    if (Object.values(newErrors).some(x => x !== '')) return; 

    setIsLoading(true);

    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/register`, {
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
        const endTime = Date.now();
        const timeSpent = (endTime - startTime) / 1000; 
        sessionStorage.setItem('time_reg', timeSpent.toString());
        
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
           router.push('/login');
        }, 1500);

      } else {
        setIsLoading(false);
        alert(data.message || data.error);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error:', error);
      alert('Cannot connect to server');
    }
  };

  const isButtonDisabled = Object.values(errors).some(err => err !== '');

  const getPasswordScore = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; 
    return score;
  };

  const getMissingReqs = (pass: string) => {
    if (!pass) return ["8+ characters", "1 uppercase", "1 lowercase", "1 number"];
    const reqs = [];
    if (pass.length < 8) reqs.push("At least 8 characters");
    if (!/[A-Z]/.test(pass)) reqs.push("One uppercase letter");
    if (!/[a-z]/.test(pass)) reqs.push("One lowercase letter");
    if (!/[0-9]/.test(pass)) reqs.push("One number");
    if (!/[^A-Za-z0-9]/.test(pass)) reqs.push("One special character (Optional)");
    return reqs;
  };

  const passScore = getPasswordScore(formData.password);
  const missingReqs = getMissingReqs(formData.password);

  const strengthConfig = {
    0: { label: '', color: '#e5e7eb', bars: 0 },
    1: { label: 'Very Weak', color: '#6b7280', bars: 1 }, 
    2: { label: 'Weak', color: '#ef4444', bars: 2 },      
    3: { label: 'So-so', color: '#f59e0b', bars: 3 },     
    4: { label: 'Good', color: '#84cc16', bars: 4 },      
    5: { label: 'Strong', color: '#14b8a6', bars: 5 },    
  };
  
  const currentStrength = strengthConfig[passScore as keyof typeof strengthConfig];

  const inputStyle = (hasError: boolean, isValid: boolean, customBorder?: string): CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '6px',
    border: `1px solid ${customBorder ? customBorder : (hasError ? '#ef4444' : (isValid ? '#10b981' : '#e5e7eb'))}`,
    backgroundColor: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    color: '#333',
    transition: 'border-color 0.3s'
  });

  const errorTextStyle: CSSProperties = {
    color: '#ef4444', fontSize: '0.85rem', marginTop: '5px', textAlign: 'left' as const
  };

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

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '3rem', borderRadius: '12px', width: '100%', maxWidth: '550px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <style>{`
        @keyframes spin-border {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

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
              value={formData.fullname} onChange={handleChange} onBlur={handleBlur}
              style={inputStyle(!!errors.fullname, formData.fullname.trim().length > 0 && !errors.fullname)}
            />
            {errors.fullname && <p style={errorTextStyle}>{errors.fullname}</p>}
          </div>
        )}

        {!isGoogleRegister && (
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Email Address</label>
            <input 
              type="email" name="email" placeholder="john@example.com"
              value={formData.email} onChange={handleChange} onBlur={handleBlur}
              style={inputStyle(!!errors.email, formData.email.trim().length > 0 && !errors.email)}
            />
            {errors.email && <p style={errorTextStyle}>{errors.email}</p>}
          </div>
        )}

        <div>
          <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Username</label>
          <input 
            type="text" name="username" placeholder="Username"
            value={formData.username} onChange={handleChange} onBlur={handleBlur}
            style={inputStyle(!!errors.username, formData.username.trim().length > 0 && !errors.username)}
          />
          {errors.username && <p style={errorTextStyle}>{errors.username}</p>}
        </div>
        
        <div>
          <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={{
                ...inputStyle(false, false, formData.password.length > 0 ? currentStrength.color : undefined),
                paddingRight: '45px'
              }}
            />
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

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
             {[1, 2, 3, 4, 5].map((num) => (
                <div 
                  key={num} 
                  style={{ 
                    height: '4px', flex: 1, borderRadius: '2px', transition: 'background-color 0.3s ease',
                    backgroundColor: num <= currentStrength.bars ? currentStrength.color : '#e5e7eb' 
                  }} 
                />
             ))}
          </div>

          {formData.password.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '6px' }}>
               <span style={{ fontSize: '0.75rem', fontWeight: 600, color: currentStrength.color }}>
                 {currentStrength.label}
               </span>
               
               <div className="group relative ml-2 flex items-center justify-center">
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#6b7280', 
                    color: 'white', fontSize: '10px', cursor: 'help', fontWeight: 'bold'
                  }}>i</span>
                  
                  <div className="absolute bottom-full right-0 mb-2 hidden w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg group-hover:block z-10">
                     <p className="font-semibold mb-1 text-gray-200">Missing Requirements:</p>
                     {missingReqs.length > 0 ? (
                        <ul style={{ paddingLeft: '16px', margin: 0, listStyleType: 'disc', lineHeight: '1.6' }}>
                           {missingReqs.map((req, i) => <li key={i}>{req}</li>)}
                        </ul>
                     ) : (
                        <span className="text-teal-400">Perfect! Password is very strong.</span>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '-5px' }}>
          <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555'}}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword" 
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{
                ...inputStyle(!!errors.confirmPassword, formData.confirmPassword.length > 0 && !errors.confirmPassword),
                paddingRight: '45px'
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280'
              }}
            >
              <EyeIcon isVisible={showConfirmPassword} />
            </button>
          </div>
          {errors.confirmPassword && <p style={errorTextStyle}>{errors.confirmPassword}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isButtonDisabled || isLoading || isSuccess} 
          onMouseOver={() => setIsHovering(true)}
          onMouseOut={() => setIsHovering(false)}
          style={{ 
            position: 'relative',
            overflow: 'hidden',
            padding: '14px', borderRadius: '6px', border: 'none', 
            backgroundColor: isButtonDisabled ? '#9ca3af' : (isSuccess ? '#059669' : '#10b981'),
            color: 'white', fontSize: '1.1rem', fontWeight: '600', 
            cursor: isButtonDisabled || isLoading || isSuccess ? 'not-allowed' : 'pointer', 
            marginTop: '1rem', 
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isLoading && (
            <>
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '300%', height: '300%',
                background: 'conic-gradient(transparent, rgba(255, 0, 0, 0.9), transparent 30%)',
                transform: 'translate(-50%, -50%)',
                animation: 'spin-border 3s linear infinite'
              }} />
              <div style={{
                position: 'absolute',
                inset: '3px',
                backgroundColor: '#10b981', 
                borderRadius: '4px'
              }} />
            </>
          )}

          <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLoading ? 'Registering...' : (isSuccess ? '✓ Sign up complete' : 'Register')}
          </span>
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
        Already have an account? <a href="/login" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>Log in</a>
      </div>
    </div>
  );
}