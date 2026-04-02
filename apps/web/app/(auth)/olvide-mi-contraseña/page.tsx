'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Orbit, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { authClient } from '@/lib/api/auth-client';
import { AuthShell } from '../_components/auth-shell';
import { getAuthErrorMessage } from '../_components/auth-error';
import { AuthAlert, AuthField, AuthSurface } from '../_components/auth-ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await authClient.forgotPassword(email);
      setIsSubmitted(true);
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'No fue posible enviar el enlace.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Recuperación"
      title="Recupera el acceso sin perder el ritmo."
      description="Envía un enlace seguro a tu correo y vuelve a operar con instrucciones claras, feedback directo y un flujo pensado para situaciones reales." 
      heroTitle="Cuando el acceso falla, la experiencia no debería hacerlo."
      heroDescription="Este flujo prioriza claridad: qué pasó, qué sigue y cómo retomar el control sin ruido ni ambigüedad."
      metrics={[
        { icon: ShieldCheck, label: 'Enlace', value: 'Temporal' },
        { icon: Radio, label: 'Entrega', value: 'Guiada' },
        { icon: Orbit, label: 'Soporte', value: 'Auto-servicio' },
      ]}
      highlights={[
        {
          icon: Sparkles,
          title: 'Mensajería más precisa',
          description: 'Explicamos qué revisar, dónde buscar el correo y cuándo volver a intentarlo.',
        },
        {
          icon: Mail,
          title: 'Flujo simple',
          description: 'Un solo campo, una acción clara y estado de éxito inequívoco para evitar dudas.',
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
        {isSubmitted ? (
          <AuthAlert
            tone="success"
            title="Correo enviado"
            description={`Si ${email} existe en Tenaxis, te llegará un enlace para restablecer tu contraseña.`}
            className="mb-6"
          />
        ) : null}

        <div className="space-y-6">
          {!isSubmitted ? (
            <>
              <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/75 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                Ingresa el correo asociado a tu cuenta. Si existe, recibirás instrucciones para continuar.
              </div>

              {error ? (
                <AuthAlert tone="error" title="No pudimos procesar tu solicitud" description={error} />
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <AuthField label="Correo electrónico" hint="Revisa spam si no llega" icon={Mail}>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80"
                    placeholder="operaciones@empresa.com"
                  />
                </AuthField>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !email.trim()}
                  className="h-14 w-full rounded-[1.25rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white shadow-[0_18px_50px_rgba(2,19,89,0.35)] hover:opacity-95 dark:text-white"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando enlace...
                    </span>
                  ) : (
                    'Enviar enlace seguro'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-base leading-7">
                Revisa tu bandeja de entrada y también spam/promociones. Si no lo ves en unos minutos, vuelve a intentar o confirma que escribiste bien tu correo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-14 rounded-[1.1rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white dark:text-white">
                  <Link href="/iniciar-sesion">Volver a iniciar sesión</Link>
                </Button>
                <Button type="button" variant="outline" size="lg" className="h-14 rounded-[1.1rem] border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => { setIsSubmitted(false); setError(null); }}>
                  Intentar con otro correo
                </Button>
              </div>
            </div>
          )}
        </div>
      </AuthSurface>
    </AuthShell>
  );
}
