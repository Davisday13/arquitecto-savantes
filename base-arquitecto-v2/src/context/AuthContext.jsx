import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getPermisos } from '../lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = useCallback(async (userId) => {
    const { data } = await supabase.from('usuarios').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      setPermisos(getPermisos(data.rol, data.permisos_extra));
    }
    return data;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) cargarPerfil(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) cargarPerfil(s.user.id);
      else { setProfile(null); setPermisos(null); }
    });

    return () => subscription?.unsubscribe();
  }, [cargarPerfil]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.session) {
      setSession(data.session);
      await cargarPerfil(data.session.user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermisos(null);
  };

  const cambiarPassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, profile, permisos, loading, login, logout, cargarPerfil, cambiarPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
