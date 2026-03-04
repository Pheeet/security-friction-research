import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <Suspense fallback={
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading registration...
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}