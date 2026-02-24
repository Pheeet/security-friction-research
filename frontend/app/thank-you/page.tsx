//app/thank-you

import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
        
        {/* ไอคอนเครื่องหมายถูก (Success) */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          บันทึกข้อมูลเรียบร้อย
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          ขอบคุณที่ร่วมทดสอบครับ!
        </p>
        
      </div>
    </div>
  );
}