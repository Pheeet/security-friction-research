'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- โครงสร้างคำถามเดิม ---
const surveyQuestions = [
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

export default function SurveyPage() {
  const router = useRouter();
  
  const [isAdaptivePhase, setIsAdaptivePhase] = useState(false);

  useEffect(() => {
    const currentMode = sessionStorage.getItem('experiment_mode');
    if (currentMode === 'adaptive') {
      setIsAdaptivePhase(true);
    }
  }, []);

  const [demographics, setDemographics] = useState({
    ageGroup: '',
    gender: '',
    otherGenderInput: '' 
  });

  const [answers, setAnswers] = useState<Record<string, number | null>>({
    q1: null, q2: null, q3: null, q4: null, q5: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemographicChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setDemographics((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isSurveyAnswered = Object.values(answers).every((val) => val !== null);
  const isDemographicsAnswered = 
    demographics.ageGroup !== '' && 
    demographics.gender !== '' && 
    (demographics.gender !== 'Other' || demographics.otherGenderInput.trim() !== '');

  const isAllAnswered = isSurveyAnswered && (isAdaptivePhase || isDemographicsAnswered);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) {
      alert('กรุณาตอบคำถามให้ครบทุกข้อครับ');
      return;
    }

    setIsSubmitting(true);

    const finalGender = demographics.gender === 'Other' 
      ? `Other: ${demographics.otherGenderInput}` 
      : demographics.gender;

    const userId = sessionStorage.getItem('secure_user_id') || '';
    const currentMode = sessionStorage.getItem('experiment_mode') || 'static';

    try {
      const res = await fetch('http://localhost:8080/api/research/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        // ล้างข้อมูลที่ใช้สำหรับการทดสอบรอบนี้ทิ้งบางส่วน
        // (ส่วน ID หรือ experiment_mode ปล่อยให้หน้า Thank You ไปจัดการต่อ)
        sessionStorage.removeItem('captcha_type');
        sessionStorage.removeItem('require_2fa');

        // ไม่ว่าจะจบรอบ 1 หรือรอบ 2 ให้ส่งไปหน้า /thank-you เสมอ
        // เพราะโค้ดใน ThankYouPage.tsx ของคุณจะเช็ค experiment_mode และแยกหน้าให้เอง!
        router.push('/thank-you'); 

      } else {
        throw new Error("Backend save failed");
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-green-600 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAdaptivePhase ? '🎉 ยืนยันตัวตนรอบที่ 2 สำเร็จ!' : '🎉 ยืนยันตัวตนสำเร็จ!'}
          </h1>
          <p className="text-gray-600">
            {isAdaptivePhase 
              ? 'รบกวนประเมินความพึงพอใจของการยืนยันตัวตน "ในรอบนี้" อีกครั้งครับ (ส่วนสุดท้ายแล้วครับ)' 
              : <>รบกวนเวลาทำแบบสอบถามสั้นๆ เพื่อใช้เป็นข้อมูลในงานวิจัย <br className="hidden sm:block"/>คำตอบของคุณมีค่ามากสำหรับการพัฒนาระบบครับ</>}
          </p>
          <p className="text-red-500 text-sm mt-4">* ระบุว่าเป็นคำถามที่จำเป็น</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {!isAdaptivePhase && (
            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-2">ข้อมูลทั่วไป</h2>

              <div className="mb-6">
                <label htmlFor="ageGroup" className="block text-lg font-medium text-gray-900 mb-2">
                  อายุของคุณอยู่ในช่วงใด? <span className="text-red-500">*</span>
                </label>
                <select id="ageGroup" name="ageGroup" value={demographics.ageGroup} onChange={handleDemographicChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
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
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="gender" value="Male" checked={demographics.gender === 'Male'} onChange={handleDemographicChange} className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3" />
                    <span className="text-gray-700">ชาย (Male)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="gender" value="Female" checked={demographics.gender === 'Female'} onChange={handleDemographicChange} className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3" />
                    <span className="text-gray-700">หญิง (Female)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="gender" value="Prefer not to say" checked={demographics.gender === 'Prefer not to say'} onChange={handleDemographicChange} className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3" />
                    <span className="text-gray-700">ไม่ต้องการตอบ (Prefer not to say)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="gender" value="Other" checked={demographics.gender === 'Other'} onChange={handleDemographicChange} className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3" />
                    <span className="text-gray-700 whitespace-nowrap mr-3">อื่นๆ / ไม่ระบุ (โปรดระบุ):</span>
                    <input type="text" name="otherGenderInput" value={demographics.otherGenderInput} onChange={handleDemographicChange} disabled={demographics.gender !== 'Other'} placeholder="ระบุเพศของคุณ" className={`mt-1 block w-full sm:w-auto flex-1 border border-gray-300 text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm px-3 py-1.5 transition-all ${demographics.gender !== 'Other' ? 'opacity-60 cursor-not-allowed bg-gray-200' : 'bg-white'}`} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {surveyQuestions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                {index + 1}. {q.text} <span className="text-red-500">*</span>
              </h2>
              <div className="flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0">
                {q.options.map((opt) => (
                  <label key={`${q.id}-${opt.val}`} className="flex sm:flex-col items-center cursor-pointer group">
                    <input type="radio" name={q.id} value={opt.val} checked={answers[q.id] === opt.val} onChange={() => handleOptionChange(q.id, opt.val)} className="w-5 h-5 text-green-600 border border-gray-300 focus:ring-green-500 mr-3 sm:mr-0 sm:mb-2" />
                    <span className="text-sm text-gray-600 text-center group-hover:text-gray-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4 pb-12">
            <button type="submit" disabled={!isAllAnswered || isSubmitting} className={`px-8 py-3 rounded-md text-white font-medium text-lg transition-colors shadow-sm ${(!isAllAnswered || isSubmitting) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำตอบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}