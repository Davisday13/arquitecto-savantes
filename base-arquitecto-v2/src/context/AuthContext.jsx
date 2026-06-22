import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getPermisos } from '../lib/constants';

const AuthContext = createContext(null);

function crearPerfilDeSesion(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    nombre: user.email?.split('@')[0],
    email_login: user.email,
    rol: user.user_metadata?.rol || 'CLIENTE',
    activo: true,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfilDb = useCallback(async (userId) => {
    const { data } = await supabase.from('usuarios').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      setPermisos(getPermisos(data.rol, data.permisos_extra));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setProfile(crearPerfilDeSesion(s?.user));
      setPermisos(getPermisos(s?.user?.user_metadata?.rol || 'CLIENTE', null));
      setLoading(false);
      if (s?.user) cargarPerfilDb(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setProfile(crearPerfilDeSesion(s?.user));
      setPermisos(getPermisos(s?.user?.user_metadata?.rol || 'CLIENTE', null));
      if (s?.user) cargarPerfilDb(s.user.id);
    });

    return () => subscription?.unsubscribe();
  }, [cargarPerfilDb]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.session) {
      setSession(data.session);
      setProfile(crearPerfilDeSesion(data.session.user));
      setPermisos(getPermisos(data.session.user?.user_metadata?.rol || 'CLIENTE', null));
      cargarPerfilDb(data.session.user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPermisos(null);
  };

  const cambiarPassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, profile, permisos, loading, login, logout, cargarPerfilDb, cambiarPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
