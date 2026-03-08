'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';

// --- โครงสร้างคำถาม (อยู่นอก Component เพื่อไม่ให้ถูกสร้างใหม่ทุกครั้ง) ---
const surveyQuestions = [
  // ... (ข้อมูลชุดเดิมของคุณ ไม่ต้องเปลี่ยน) ...
  {
    id: 'q1',
    text: 'คุณรู้สึกว่าขั้นตอนการยืนยันตัวตนเมื่อครู่นี้มีความ "ยุ่งยาก" เพียงใด?',
    options: [
      { val: 0, label: '0 (ยากที่สุด)' }, { val: 1, label: '1 (ยุ่งยากมาก)' },
      { val: 2, label: '2 (ค่อนข้างยุ่งยาก)' }, { val: 3, label: '3 (ปานกลาง)' },
      { val: 4, label: '4 (ง่าย)' }, { val: 5, label: '5 (ง่ายมาก)' },
    ],
  },
  {
    id: 'q2',
    text: 'คุณรู้สึกว่าระบบสื่อสารกับคุณได้ "ชัดเจน" เพียงใด (เช่น คำสั่งเข้าใจง่าย, รูปภาพชัดเจน)?',
    options: [
      { val: 0, label: '0 (ไม่ชัดเจนเลย)' }, { val: 1, label: '1 (ชัดเจนน้อยมาก)' },
      { val: 2, label: '2 (ชัดเจนน้อย)' }, { val: 3, label: '3 (ชัดเจนปานกลาง)' },
      { val: 4, label: '4 (ชัดเจนดี)' }, { val: 5, label: '5 (ชัดเจนแจ่มแจ้ง)' },
    ],
  },
  {
    id: 'q3',
    text: 'คุณรู้สึกว่า "เวลา" ที่ใช้ไปในการยืนยันตัวตนเหมาะสมหรือไม่?',
    options: [
      { val: 0, label: '0 (ยอมรับไม่ได้เลย)' }, { val: 1, label: '1 (ยอมรับได้ยากมาก)' },
      { val: 2, label: '2 (ไม่จำเป็นจะไม่ใช้)' }, { val: 3, label: '3 (ปานกลาง)' },
      { val: 4, label: '4 (ยอมรับได้ดี)' }, { val: 5, label: '5 (สมบูรณ์แบบ)' },
    ],
  },
  {
    id: 'q4',
    text: 'คุณมีความมั่นใจใน "ความปลอดภัย" ของระบบนี้มากน้อยเพียงใด?',
    options: [
      { val: 0, label: '0 (ไม่น่าเชื่อถือเลย)' }, { val: 1, label: '1 (ไม่ค่อยปลอดภัย)' },
      { val: 2, label: '2 (เฉยๆ/ไม่แน่ใจ)' }, { val: 3, label: '3 (ค่อนข้างปลอดภัย)' },
      { val: 4, label: '4 (ปลอดภัยมาก)' }, { val: 5, label: '5 (มั่นใจสูงสุด)' },
    ],
  },
  {
    id: 'q5',
    text: 'หากเว็บไซต์ที่คุณต้องใช้งานเป็นประจำใช้ต้องยืนยันตัวตนรูปแบบนี้ทุกครั้ง คุณยังต้องการใช้งานเว็บไซต์นี้ต่อไปหรือไม่?',
    options: [
      { val: 0, label: '0 (เลิกใช้งานทันที)' }, { val: 1, label: '1 (มีแนวโน้มจะเลิกใช้)' },
      { val: 2, label: '2 (รู้สึกรำคาญ)' }, { val: 3, label: '3 (ใช้งานได้ตามปกติ)' },
      { val: 4, label: '4 (ใช้งานต่อได้อย่างสบายใจ)' }, { val: 5, label: '5 (ใช้งานต่อแน่นอน)' },
    ],
  },
];

// --- 🛡️ Optimization 1: Memoized Question Block ---
const QuestionBlock = memo(({ q, index, currentAnswer, onChange }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        {index + 1}. {q.text} <span className="text-red-500">*</span>
      </h2>
      <div className="flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0">
        {q.options.map((opt: any) => (
          <label key={`${q.id}-${opt.val}`} className="flex sm:flex-col items-center cursor-pointer group touch-manipulation">
            <input 
              type="radio" 
              name={q.id} 
              value={opt.val} 
              checked={currentAnswer === opt.val} 
              onChange={() => onChange(q.id, opt.val)} 
              className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3 sm:mr-0 sm:mb-2" 
            />
            <span className="text-sm text-gray-600 text-center group-hover:text-gray-900">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
});
QuestionBlock.displayName = 'QuestionBlock';

// --- 🛡️ Optimization 2: แยก Demographic ออกมาและทำ Memo ---
const DemographicBlock = memo(({ demographics, onChange }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-2">ข้อมูลทั่วไป</h2>

      <div className="mb-6">
        <label htmlFor="ageGroup" className="block text-lg font-medium text-gray-900 mb-2">
          อายุของคุณอยู่ในช่วงใด? <span className="text-red-500">*</span>
        </label>
        <select 
          id="ageGroup" 
          name="ageGroup" 
          value={demographics.ageGroup} 
          onChange={onChange} 
          className="mt-1 block w-full pl-3 pr-10 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm touch-manipulation"
        >
          <option value="" disabled>-- กรุณาเลือกช่วงอายุ --</option>
          <option value="Under 18">ต่ำกว่า 18 ปี</option>
          <option value="18-24">18 - 24 ปี</option>
          <option value="25-34">25 - 34 ปี</option>
          <option value="35-49">35 - 49 ปี</option>
          <option value="50+">50 ปีขึ้นไป</option>
        </select>
      </div>

      <div>
        <label className="block text-lg font-medium text-gray-900 mb-3">เพศของคุณ <span className="text-red-500">*</span></label>
        <div className="space-y-3">
          {['Male', 'Female', 'Prefer not to say', 'Other'].map((g) => (
            <label key={g} className="flex items-center cursor-pointer touch-manipulation">
              <input 
                type="radio" 
                name="gender" 
                value={g} 
                checked={demographics.gender === g} 
                onChange={onChange} 
                className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3" 
              />
              <span className="text-gray-700">
                {g === 'Male' ? 'ชาย (Male)' : g === 'Female' ? 'หญิง (Female)' : g === 'Other' ? 'อื่นๆ' : 'ไม่ต้องการตอบ'}
              </span>
              {g === 'Other' && (
                <input 
                  type="text" 
                  name="otherGenderInput" 
                  value={demographics.otherGenderInput} 
                  onChange={onChange} 
                  disabled={demographics.gender !== 'Other'} 
                  placeholder="ระบุเพศ" 
                  className={`ml-3 block flex-1 border border-gray-300 rounded-md px-3 py-1.5 sm:text-sm transition-opacity duration-200 ${demographics.gender !== 'Other' ? 'opacity-40 bg-gray-100' : 'bg-white'}`} 
                />
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
});
DemographicBlock.displayName = 'DemographicBlock';

export default function SurveyPage() {
  const router = useRouter();
  
  const [isAdaptivePhase, setIsAdaptivePhase] = useState(false);
  const [isCheckingMode, setIsCheckingMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [demographics, setDemographics] = useState({
    ageGroup: '',
    gender: '',
    otherGenderInput: '' 
  });

  const [answers, setAnswers] = useState<Record<string, number | null>>({
    q1: null, q2: null, q3: null, q4: null, q5: null,
  });

  useEffect(() => {
    const currentMode = sessionStorage.getItem('experiment_mode');
    if (currentMode === 'adaptive') {
      setIsAdaptivePhase(true);
    }
    setIsCheckingMode(false);
  }, []);

  const handleOptionChange = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // --- 🛡️ Optimization 3: หุ้ม useCallback ให้ฟังก์ชันจัดการ Demographic ---
  const handleDemographicChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setDemographics((prev) => ({ ...prev, [name]: value }));
  }, []);

  const isSurveyAnswered = Object.values(answers).every((val) => val !== null);
  const isDemographicsAnswered = 
    demographics.ageGroup !== '' && 
    demographics.gender !== '' && 
    (demographics.gender !== 'Other' || demographics.otherGenderInput.trim() !== '');

  const isAllAnswered = isSurveyAnswered && (isAdaptivePhase || isDemographicsAnswered);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered || isSubmitting) {
      alert('กรุณาตอบคำถามให้ครบทุกข้อครับ');
      return;
    }

    setIsSubmitting(true);
    const finalGender = demographics.gender === 'Other' 
      ? `Other: ${demographics.otherGenderInput}` 
      : demographics.gender;

    const userId = sessionStorage.getItem('secure_user_id') || '';
    const currentMode = sessionStorage.getItem('experiment_mode') || 'static';
    const token = localStorage.getItem('token') || sessionStorage.getItem('token'); 

    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")}/api/research/survey`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          testPhase: currentMode,
          ageGroup: isAdaptivePhase ? '' : demographics.ageGroup,
          gender: isAdaptivePhase ? '' : finalGender,
          q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4, q5: answers.q5
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        sessionStorage.removeItem('captcha_type');
        sessionStorage.removeItem('require_2fa');
        setTimeout(() => router.push('/thank-you'), 2000);
      } else {
        throw new Error("Backend save failed");
      }
    } catch (error) {
      setIsSubmitting(false);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (isCheckingMode) return <div className="min-h-screen bg-gray-50" />;

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-800 font-bold text-lg mb-2">Saving your responses...</p>
          <p className="text-gray-500 text-sm">บันทึกข้อมูลสำเร็จ กำลังพาคุณไปยังหน้าสุดท้าย</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-green-600 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAdaptivePhase ? '🎉 ยืนยันตัวตนรอบที่ 2 สำเร็จ!' : '🎉 ยืนยันตัวตนสำเร็จ!'}
          </h1>
          <p className="text-gray-600">
            {isAdaptivePhase 
              ? 'รบกวนประเมินความพึงพอใจของการยืนยันตัวตน "ในรอบนี้" อีกครั้งครับ' 
              : 'รบกวนเวลาทำแบบสอบถามสั้นๆ คำตอบของคุณมีค่ามากครับ'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* เรียกใช้ Component ที่แยกออกมา */}
          {!isAdaptivePhase && (
            <DemographicBlock 
              demographics={demographics} 
              onChange={handleDemographicChange} 
            />
          )}

          {surveyQuestions.map((q, index) => (
            <QuestionBlock 
              key={q.id}
              q={q}
              index={index}
              currentAnswer={answers[q.id]}
              onChange={handleOptionChange}
            />
          ))}

          <div className="flex justify-end pt-4 pb-12">
            <button 
              type="submit" 
              disabled={!isAllAnswered || isSubmitting} 
              className={`px-8 py-3 rounded-md text-white font-medium text-lg transition-all duration-300 shadow-sm flex items-center gap-3
                ${(!isAllAnswered || isSubmitting) 
                  ? 'bg-gray-300 opacity-60 cursor-not-allowed scale-95' 
                  : 'bg-green-600 hover:bg-green-700 active:scale-95' 
                }`}
            >
              {isSubmitting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำตอบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}