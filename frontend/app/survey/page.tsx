//app/survey

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- โครงสร้างคำถามที่แกะมาจากรูปภาพ ---
const surveyQuestions = [
  {
    id: 'q1',
    text: 'คุณรู้สึกว่าขั้นตอนการยืนยันตัวตนเมื่อครู่นี้มีความ "ยุ่งยาก" เพียงใด?',
    options: [
      { val: 0, label: '0 (ยากที่สุด)' },
      { val: 1, label: '1 (ยุ่งยากมาก)' },
      { val: 2, label: '2 (ค่อนข้างยุ่งยาก)' },
      { val: 3, label: '3 (ปานกลาง)' },
      { val: 4, label: '4 (ง่าย)' },
      { val: 5, label: '5 (ง่ายมาก)' },
    ],
  },
  {
    id: 'q2',
    text: 'คุณรู้สึกว่าระบบสื่อสารกับคุณได้ "ชัดเจน" เพียงใด (เช่น คำสั่งเข้าใจง่าย, รูปภาพชัดเจน)?',
    options: [
      { val: 0, label: '0 (ไม่ชัดเจนเลย)' },
      { val: 1, label: '1 (ชัดเจนน้อยมาก)' },
      { val: 2, label: '2 (ชัดเจนน้อย)' },
      { val: 3, label: '3 (ชัดเจนปานกลาง)' },
      { val: 4, label: '4 (ชัดเจนดี)' },
      { val: 5, label: '5 (ชัดเจนแจ่มแจ้ง)' },
    ],
  },
  {
    id: 'q3',
    text: 'คุณรู้สึกว่า "เวลา" ที่ใช้ไปในการยืนยันตัวตนเหมาะสมหรือไม่?',
    options: [
      { val: 0, label: '0 (ยอมรับไม่ได้เลย)' },
      { val: 1, label: '1 (ยอมรับได้ยากมาก)' },
      { val: 2, label: '2 (ไม่จำเป็นจะไม่ใช้)' },
      { val: 3, label: '3 (ปานกลาง)' },
      { val: 4, label: '4 (ยอมรับได้ดี)' },
      { val: 5, label: '5 (สมบูรณ์แบบ)' },
    ],
  },
  {
    id: 'q4',
    text: 'คุณมีความมั่นใจใน "ความปลอดภัย" ของระบบนี้มากน้อยเพียงใด?',
    options: [
      { val: 0, label: '0 (ไม่น่าเชื่อถือเลย)' },
      { val: 1, label: '1 (ไม่ค่อยปลอดภัย)' },
      { val: 2, label: '2 (เฉยๆ/ไม่แน่ใจ)' },
      { val: 3, label: '3 (ค่อนข้างปลอดภัย)' },
      { val: 4, label: '4 (ปลอดภัยมาก)' },
      { val: 5, label: '5 (มั่นใจสูงสุด)' },
    ],
  },
  {
    id: 'q5',
    text: 'หากเว็บไซต์ที่คุณต้องใช้งานเป็นประจำใช้ต้องยืนยันตัวตนรูปแบบนี้ทุกครั้ง คุณยังต้องการใช้งานเว็บไซต์นี้ต่อไปหรือไม่?',
    options: [
      { val: 0, label: '0 (เลิกใช้งานทันที)' },
      { val: 1, label: '1 (มีแนวโน้มจะเลิกใช้)' },
      { val: 2, label: '2 (รู้สึกรำคาญ)' },
      { val: 3, label: '3 (ใช้งานได้ตามปกติ)' },
      { val: 4, label: '4 (ใช้งานต่อได้อย่างสบายใจ)' },
      { val: 5, label: '5 (ใช้งานต่อแน่นอน)' },
    ],
  },
];

export default function SurveyPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number | null>>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // อัปเดตคำตอบ
  const handleOptionChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ตรวจสอบว่าตอบครบทุกข้อหรือยัง
  const isAllAnswered = Object.values(answers).every((val) => val !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) {
      alert('กรุณาตอบคำถามให้ครบทุกข้อครับ');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. ส่งคำตอบไปให้ Backend (ส่วนข้อมูลเวลา Backend จะไปดึงจาก DB เอง)
      const res = await fetch('http://localhost:8080/api/research/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ส่ง JWT Cookie ไปด้วยเพื่อให้ Backend รู้ว่าเป็นใคร
        body: JSON.stringify({
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          q4: answers.q4,
          q5: answers.q5
        }),
      });

      if (res.ok) {
        sessionStorage.removeItem('secure_user_id');
        sessionStorage.removeItem('captcha_type');
        sessionStorage.removeItem('require_2fa');
        alert('บันทึกข้อมูลเรียบร้อย ขอบคุณที่ร่วมทดสอบครับ!');
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
        
        {/* ส่วนหัว */}
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-green-600 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🎉 ยืนยันตัวตนสำเร็จ!</h1>
          <p className="text-gray-600">
            รบกวนเวลาทำแบบสอบถามสั้นๆ เพื่อใช้เป็นข้อมูลในงานวิจัย <br className="hidden sm:block"/>
            คำตอบของคุณมีค่ามากสำหรับการพัฒนาระบบครับ
          </p>
          <p className="text-red-500 text-sm mt-4">* ระบุว่าเป็นคำถามที่จำเป็น</p>
        </div>

        {/* ฟอร์มคำถาม */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {surveyQuestions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 sm:p-8 border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                {index + 1}. {q.text} <span className="text-red-500">*</span>
              </h2>
              
              {/* Radio Button Group แบบ Responsive (จอคอมเรียงแนวนอน จอมือถือเรียงแนวตั้ง) */}
              <div className="flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0">
                {q.options.map((opt) => (
                  <label 
                    key={`${q.id}-${opt.val}`} 
                    className="flex sm:flex-col items-center cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.val}
                      checked={answers[q.id] === opt.val}
                      onChange={() => handleOptionChange(q.id, opt.val)}
                      className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 mr-3 sm:mr-0 sm:mb-2"
                    />
                    <span className="text-sm text-gray-600 text-center group-hover:text-gray-900">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* ปุ่ม Submit */}
          <div className="flex justify-end pt-4 pb-12">
            <button
              type="submit"
              disabled={!isAllAnswered || isSubmitting}
              className={`px-8 py-3 rounded-md text-white font-medium text-lg transition-colors shadow-sm
                ${(!isAllAnswered || isSubmitting) 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำตอบ'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}