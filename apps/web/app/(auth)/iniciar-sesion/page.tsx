'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, LogIn, Radio, Orbit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { authClient } from '@/lib/api/auth-client';
import { AuthShell } from '../_components/auth-shell';
import { getAuthErrorMessage } from '../_components/auth-error';
import { AuthAlert, AuthField, AuthSurface } from '../_components/auth-ui';

function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = React.useState({ email: '', password: '' });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const expired = searchParams.get('expired');
    if (expired === 'true') {
      toast.error('Tu sesión expiró', {
        description: 'Por seguridad, vuelve a iniciar sesión para seguir trabajando.',
        duration: 5000,
      });
      window.history.replaceState({}, '', '/iniciar-sesion');
    }
  }, [searchParams]);

  const canSubmit = formData.email.trim() !== '' && formData.password.trim() !== '';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const data = await authClient.login(formData);

      if (data?.access_token) {
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `access_token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
      }

      if (data?.user?.sesionId) {
        document.cookie = `sesion_id=${data.user.sesionId}; path=/; max-age=86400; SameSite=Lax`;
      }

      if (data?.user?.tenantId) {
        document.cookie = `tenant-id=${data.user.tenantId}; path=/; max-age=86400; SameSite=Lax`;
      }

      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      window.location.href = '/dashboard';
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'No pudimos iniciar tu sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      hideHeroOnMobile
      eyebrow="Acceso seguro"
      title="Entra a tu operación sin fricción."
      description="Acceso centralizado para operadores, coordinadores y administradores. Menos ruido visual, mejor lectura de errores y una entrada más rápida a la operación."
      heroTitle="Gestión segura de identidades."
      heroDescription="Autenticación centralizada para una operación multitenant. Estado claro, recuperación directa y señales de confianza visibles desde el primer paso."
      metrics={[
        { icon: ShieldCheck, label: 'Disponibilidad', value: '99.98%' },
        { icon: Radio, label: 'Sesión', value: 'Monitoreada' },
        { icon: Orbit, label: 'Acceso', value: 'Centralizado' },
      ]}
      highlights={[
        {
          icon: Sparkles,
          title: 'Mensajes operativos',
          description: 'Expiración, credenciales inválidas y fallos de red se presentan con lenguaje más directo.',
        },
        {
          icon: ShieldCheck,
          title: 'Control de acceso',
          description: 'Diseñado para una herramienta de trabajo: jerarquía clara, menos distracciones y CTA explícitos.',
        },
      ]}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>¿Primera vez en Tenaxis?</span>
          <Link href="/registro" className="font-bold text-sky-700 transition hover:text-sky-500 dark:text-sky-300">
            Crea tu cuenta
          </Link>
        </div>
      }
      contentClassName="py-2 lg:py-0"
    >
      <AuthSurface>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/75 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <span>Usa el correo corporativo con el que administras tu tenant.</span>
            <Link href="/olvide-mi-contraseña" className="font-bold text-sky-700 transition hover:text-sky-500 dark:text-sky-300">
              Recuperar acceso
            </Link>
          </div>

          {error ? (
            <AuthAlert
              tone="error"
              title="No pudimos autenticarte"
              description={error}
            />
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField label="Correo corporativo" hint="Tu acceso principal" icon={Mail}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="equipo@empresa.com"
                className="h-14 rounded-[1.25rem] border-slate-300 bg-white pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(2,19,89,0.03)] focus-visible:border-[#021359] focus-visible:bg-white focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(2,19,89,0.28),0_0_0_4px_rgba(1,173,251,0.10)] dark:border-slate-700 dark:bg-[#060d18] dark:focus-visible:border-sky-400 dark:focus-visible:bg-[#060d18] dark:focus-visible:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.34),0_0_0_4px_rgba(56,189,248,0.10)]"
                required
              />
            </AuthField>

            <AuthField label="Contraseña" hint="Mínimo 6 caracteres" icon={Lock}>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="h-14 rounded-[1.25rem] border-slate-300 bg-white pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(2,19,89,0.03)] focus-visible:border-[#021359] focus-visible:bg-white focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_rgba(2,19,89,0.28),0_0_0_4px_rgba(1,173,251,0.10)] dark:border-slate-700 dark:bg-[#060d18] dark:focus-visible:border-sky-400 dark:focus-visible:bg-[#060d18] dark:focus-visible:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.34),0_0_0_4px_rgba(56,189,248,0.10)]"
                required
              />
            </AuthField>

            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit || loading}
              className="h-14 w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white shadow-[0_18px_50px_rgba(2,19,89,0.35)] hover:opacity-95 dark:text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/95 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse [animation-delay:160ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:320ms]" />
                  </span>
                  Verificando credenciales
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <LogIn className="h-4 w-4" />
                  Entrar al dashboard
                </span>
              )}
            </Button>
          </form>
        </div>
      </AuthSurface>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
