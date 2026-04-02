'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Lock, Orbit, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '../_components/auth-shell';
import { getAuthErrorMessage } from '../_components/auth-error';
import { AuthAlert, AuthField, AuthSurface, PasswordStrength } from '../_components/auth-ui';

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const passwordScore = React.useMemo(() => getPasswordScore(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setIsSuccess(true);
      window.setTimeout(() => {
        router.push('/iniciar-sesion');
      }, 2500);
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'No pudimos actualizar tu contraseña.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Reset seguro"
      title="Define una nueva contraseña con señales claras de seguridad."
      description="El flujo ahora enfatiza validación, claridad de estado y recuperación segura para reducir intentos fallidos y ambigüedad." 
      heroTitle="El regreso a tu cuenta también merece una gran experiencia."
      heroDescription="Alineamos este paso con el resto del nuevo sistema visual para que recuperación y acceso se sientan parte del mismo producto."
      metrics={[
        { icon: ShieldCheck, label: 'Protección', value: 'Refrescada' },
        { icon: Radio, label: 'Feedback', value: 'Instantáneo' },
        { icon: Orbit, label: 'Redirección', value: 'Automática' },
      ]}
      highlights={[
        {
          icon: Sparkles,
          title: 'Validaciones visibles',
          description: 'La contraseña se evalúa antes de enviar para reducir errores evitables.',
        },
        {
          icon: ShieldCheck,
          title: 'Éxito sin dudas',
          description: 'El estado final explica qué ocurrió y te devuelve al login sin enlaces inconsistentes.',
        },
      ]}
      footer={
        <Link href="/iniciar-sesion" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      }
    >
      <AuthSurface>
        {isSuccess ? (
          <div className="space-y-6">
            <AuthAlert
              tone="success"
              title="Contraseña actualizada"
              description="Tu acceso fue restablecido. Te redirigiremos al inicio de sesión en un momento."
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <Button asChild size="lg" className="h-14 w-fit rounded-[1.1rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white dark:text-white">
              <Link href="/iniciar-sesion">Ir al login ahora</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <AuthAlert tone="error" title="No pudimos actualizar tu contraseña" description={error} /> : null}

            <AuthField label="Nueva contraseña" hint="Mínimo 6 caracteres" icon={Lock}>
              <Input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nueva contraseña"
                className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80"
              />
            </AuthField>

            <AuthField label="Confirmar contraseña" hint="Debe coincidir" icon={Lock}>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la contraseña"
                className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80"
              />
            </AuthField>

            <PasswordStrength score={passwordScore} />

            <Button type="submit" size="lg" disabled={isLoading || !password || !confirmPassword} className="h-14 w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white shadow-[0_18px_50px_rgba(2,19,89,0.35)] hover:opacity-95 dark:text-white">
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando contraseña...
                </span>
              ) : (
                'Guardar nueva contraseña'
              )}
            </Button>
          </form>
        )}
      </AuthSurface>
    </AuthShell>
  );
}
