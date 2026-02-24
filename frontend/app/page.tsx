//app/page.tsx

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Security Friction Research
        </h1>
        <p className="text-gray-400 text-lg">
          เลือกรูปแบบ CAPTCHA เพื่อเริ่มทดสอบ (จับเวลาอัตโนมัติ)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link href="/captcha/text" className="group block p-8 bg-gray-800 rounded-2xl border border-gray-700 hover:border-blue-500 transition-all">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400">📝 1. Text CAPTCHA</h2>
            <p className="text-gray-400 text-sm">อ่านตัวอักษร (High Friction)</p>
          </Link>

          <Link href="/captcha/math" className="group block p-8 bg-gray-800 rounded-2xl border border-gray-700 hover:border-green-500 transition-all">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-green-400">🧮 2. Math CAPTCHA</h2>
            <p className="text-gray-400 text-sm">คิดเลขง่ายๆ (Cognitive Load)</p>
          </Link>
          <Link href="/captcha/slider" className="group block p-8 bg-gray-800 rounded-2xl border border-gray-700 hover:border-purple-500 transition-all">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-purple-400">🧩 3. Slider CAPTCHA</h2>
            <p className="text-gray-400 text-sm">เลื่อนชิ้นจิ๊กซอว์ให้ตรง (Motor Skills)</p>
          </Link>
          <Link href="/captcha/cloudflare" className="group block p-8 bg-gray-800 rounded-2xl border border-gray-700 hover:border-yellow-500 transition-all">
            <h2 className="text-2xl font-bold mb-2 group-hover:text-yellow-400">🛡️ 4. Cloudflare Turnstile</h2>
            <p className="text-gray-400 text-sm">CAPTCHA แบบใหม่จาก Cloudflare (Low Friction)</p>
          </Link>
        </div>
      </div>
    </main>
  );
}