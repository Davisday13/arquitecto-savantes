import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import { Input } from './ui/Input';

export default function LoginView() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Ingresa correo y contrase\u00f1a');
    setLoading(true);
    const { error: authError } = await signIn({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-brand-700 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">AC</div>
          <h1 className="text-xl font-bold text-white">ArqControl</h1>
          <p className="text-brand-200 text-sm mt-1">Software de Control para Arquitectos</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 text-center">Iniciar sesi&oacute;n</h2>
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">{error}</div>}
          <Input label="Correo electr&oacute;nico" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@miestudio.com" autoComplete="email" />
          <Input label="Contrase&ntilde;a" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          <Button type="submit" loading={loading} className="w-full justify-center">Ingresar</Button>
        </form>
      </div>
    </div>
  );
}
