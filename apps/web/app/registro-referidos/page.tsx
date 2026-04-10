'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  Mail,
  Orbit,
  Phone,
  ShieldCheck,
  Ticket,
  UserRound,
} from 'lucide-react';
import { Button, Input, Label, Select } from '@/components/ui';
import { authClient, type RegisterPayload } from '@/lib/api/auth-client';
import { AuthShell } from '../(auth)/_components/auth-shell';
import { getAuthErrorMessage } from '../(auth)/_components/auth-error';
import { AuthAlert, AuthField, AuthSurface, PasswordStrength } from '../(auth)/_components/auth-ui';

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function normalizeReferralCode(value: string | null) {
  return value?.trim().toUpperCase() ?? '';
}

export default function ReferralRegisterPage() {
  const searchParams = useSearchParams();
  const codeFromQuery = React.useMemo(() => normalizeReferralCode(searchParams.get('code')), [searchParams]);
  const [formData, setFormData] = React.useState<RegisterPayload>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    tipoDocumento: '',
    numeroDocumento: '',
    referralCode: codeFromQuery,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [stepError, setStepError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormData((prev) => {
      if (!codeFromQuery || prev.referralCode === codeFromQuery) {
        return prev;
      }
      return { ...prev, referralCode: codeFromQuery };
    });
  }, [codeFromQuery]);

  const passwordScore = React.useMemo(() => getPasswordScore(formData.password), [formData.password]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'referralCode' ? value.toUpperCase() : value,
    }));
    if (error) setError(null);
    if (stepError) setStepError(null);
  };

  const isStepOneValid = Boolean(
    formData.nombre.trim() &&
      formData.apellido.trim() &&
      formData.tipoDocumento.trim() &&
      formData.numeroDocumento.trim(),
  );
  const isStepTwoValid = Boolean(formData.email.trim() && formData.password.trim());
  const hasReferralCode = Boolean(formData.referralCode?.trim());

  const handleNextStep = () => {
    if (!isStepOneValid) {
      setStepError('Completa nombre, apellido y documento para continuar.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isStepTwoValid) {
      setStepError('Completa correo y contraseña para crear tu cuenta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authClient.register({
        ...formData,
        referralCode: formData.referralCode?.trim() || undefined,
      });
      setSuccess(true);
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, 'No pudimos crear tu cuenta por ahora.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      hideHeroOnMobile
      eyebrow="Registro por referidos"
      title="Activa tu cuenta con el enlace de un referido."
      description="Si llegaste por invitación, mantendremos tu código asociado al registro para vincularlo correctamente en Tenaxis."
      heroTitle="Onboarding guiado, claro y listo para capturar referidos."
      heroDescription="Reutilizamos el flujo de registro principal, pero con una experiencia específica para códigos compartidos y enlaces de referido."
      metrics={[
        { icon: Gift, label: 'Referidos', value: hasReferralCode ? 'Detectado' : 'Opcional' },
        { icon: Orbit, label: 'Paso a paso', value: '2 fases' },
        { icon: BadgeCheck, label: 'Tiempo', value: '< 2 min' },
      ]}
      highlights={[
        {
          icon: Ticket,
          title: 'Código vinculado al registro',
          description: 'Si llegaste con un enlace de referido, lo asociamos automáticamente al crear tu cuenta.',
        },
        {
          icon: ShieldCheck,
          title: 'Mismo flujo confiable',
          description: 'Usamos el mismo proceso de registro ya probado para no inventar un onboarding paralelo.',
        },
      ]}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>¿Ya tienes cuenta?</span>
          <Link href="/iniciar-sesion" className="font-bold text-sky-700 transition hover:text-sky-500 dark:text-sky-300">
            Inicia sesión
          </Link>
        </div>
      }
      contentClassName="py-2 lg:py-0"
    >
      <AuthSurface>
        {success ? (
          <div className="space-y-6">
            <AuthAlert
              tone="success"
              title="Cuenta creada con éxito"
              description={
                hasReferralCode
                  ? 'Tu cuenta quedó registrada y asociada al código de referido con el que llegaste.'
                  : 'Ya puedes acceder con tus credenciales y terminar de configurar tu operación dentro del dashboard.'
              }
            />
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-14 rounded-[1.1rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white dark:text-white">
                <Link href="/iniciar-sesion">
                  Entrar ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <AuthAlert
                tone={hasReferralCode ? 'success' : 'info'}
                title={hasReferralCode ? 'Llegaste con un código de referido' : 'También puedes registrarte sin código'}
                description={
                  hasReferralCode
                    ? `Usaremos el código ${formData.referralCode} para asociar tu registro al operador que te invitó.`
                    : 'Si te compartieron un enlace o un código, puedes pegarlo abajo antes de completar tu registro.'
                }
              />

              <AuthField label="Código de referido" hint={codeFromQuery ? 'Detectado desde el enlace' : 'Opcional'} icon={Ticket}>
                <Input
                  name="referralCode"
                  value={formData.referralCode ?? ''}
                  onChange={handleChange}
                  placeholder="ABC12345"
                  className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 uppercase tracking-[0.28em] dark:border-slate-800 dark:bg-slate-950/80"
                />
              </AuthField>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-[0.7rem] font-black uppercase tracking-[0.34em] text-sky-700 dark:text-sky-300">
                <span>Paso {step} de 2</span>
                <span className="text-slate-400 dark:text-slate-500">{step === 1 ? 'Identidad' : 'Credenciales'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-full rounded-full bg-[linear-gradient(90deg,#021359,#0ea5e9)] transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
              </div>
            </div>

            {error || stepError ? (
              <AuthAlert tone="error" title="Revisa la información" description={error ?? stepError ?? undefined} />
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <AuthField label="Nombre" icon={UserRound}>
                  <Input name="nombre" value={formData.nombre} onChange={handleChange} placeholder="María" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80" required />
                </AuthField>
                <AuthField label="Apellido" icon={UserRound}>
                  <Input name="apellido" value={formData.apellido} onChange={handleChange} placeholder="Gómez" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80" required />
                </AuthField>
                <div className="space-y-3 sm:col-span-1">
                  <Label className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Documento</Label>
                  <Select name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} showIcon={false} className="h-14 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                    <option value="">Selecciona...</option>
                    <option value="CC">C.C.</option>
                    <option value="CE">C.E.</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </Select>
                </div>
                <AuthField label="Número de documento" icon={CreditCard}>
                  <Input name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} placeholder="1020304050" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80" required />
                </AuthField>
                <AuthField label="Teléfono" hint="Opcional" icon={Phone}>
                  <Input name="telefono" value={formData.telefono ?? ''} onChange={handleChange} placeholder="+57 300 000 0000" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80 sm:col-span-2" />
                </AuthField>
              </div>
            ) : (
              <div className="space-y-5">
                <AuthField label="Correo corporativo" hint="Será tu acceso principal" icon={Mail}>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="equipo@empresa.com" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80" required />
                </AuthField>
                <AuthField label="Contraseña" hint="Usa mayúsculas y números" icon={Lock}>
                  <Input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Crea una contraseña" className="h-14 rounded-[1.25rem] border-slate-200 bg-white pl-11 dark:border-slate-800 dark:bg-slate-950/80" required />
                </AuthField>
                <PasswordStrength score={passwordScore} />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {step === 2 ? (
                <Button type="button" variant="outline" size="lg" className="h-14 rounded-[1.1rem] border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              ) : null}

              {step === 1 ? (
                <Button type="button" size="lg" className="h-14 rounded-[1.1rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white dark:text-white" onClick={handleNextStep}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="lg" disabled={loading || !isStepTwoValid} className="h-14 rounded-[1.1rem] bg-[linear-gradient(135deg,#021359,#0f5bd7)] text-white dark:text-white">
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </span>
                  ) : (
                    'Crear cuenta'
                  )}
                </Button>
              )}
            </div>
          </form>
        )}
      </AuthSurface>
    </AuthShell>
  );
}
