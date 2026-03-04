// src/pages/profile/index.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useAuth } from '../../components/auth/AuthContext';
import { Shield, Mail, User, Lock, Eye, EyeOff, ArrowLeft, Briefcase, Building2, MapPin, Globe } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  otro_tecnico: 'Técnico (externo)',
  operario: 'Operario',
  cliente: 'Cliente',
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    tecnico: 'bg-emerald-100 text-emerald-700',
    otro_tecnico: 'bg-teal-100 text-teal-700',
    operario: 'bg-yellow-100 text-yellow-700',
    cliente: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[role] ?? 'bg-gray-100 text-gray-700'}`}>
      <Shield size={11} />
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSSOUser = user?.authMethod === 'sso' || user?.email?.endsWith('@choucairtesting.com');

  // Change password form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwdMsg({ type: 'error', text: data?.error || 'Error al cambiar la contraseña.' });
      } else {
        setPwdMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'No se pudo conectar con el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="pt-6 px-4 max-w-2xl mx-auto pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver
      </button>

      {/* User info card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Información de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <span
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: '#93D500', color: '#222222' }}
            >
              {user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </span>
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-base">{user.name}</span>
                <RoleBadge role={user.role} />
                {isSSOUser && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                    SSO Corporativo
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Mail size={13} />
                {user.email}
              </p>
              {user.title && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Briefcase size={13} />
                  {user.title}
                </p>
              )}
            </div>
          </div>

          {/* Datos corporativos del Datalake */}
          {user.ssoProfile && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Información corporativa</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {user.ssoProfile.area && (
                  <div className="flex items-start gap-2">
                    <Building2 size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-400">Área</dt>
                      <dd className="text-gray-700">{user.ssoProfile.area}</dd>
                    </div>
                  </div>
                )}
                {user.ssoProfile.uen && (
                  <div className="flex items-start gap-2">
                    <Shield size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-400">Unidad de negocio</dt>
                      <dd className="text-gray-700">{user.ssoProfile.uen}</dd>
                    </div>
                  </div>
                )}
                {user.ssoProfile.ciudadNomina && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-400">Ciudad</dt>
                      <dd className="text-gray-700">{user.ssoProfile.ciudadNomina}</dd>
                    </div>
                  </div>
                )}
                {user.ssoProfile.paisNomina && (
                  <div className="flex items-start gap-2">
                    <Globe size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-400">País</dt>
                      <dd className="text-gray-700">{user.ssoProfile.paisNomina}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password card — solo usuarios locales (no SSO) */}
      {!isSSOUser && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock size={16} />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              {/* Current password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres</p>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              {pwdMsg && (
                <div className={`text-sm px-3 py-2 rounded ${pwdMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {pwdMsg.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving || !currentPwd || !newPwd || !confirmPwd}
              >
                {saving ? 'Guardando...' : 'Guardar contraseña'}
              </Button>
            </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
