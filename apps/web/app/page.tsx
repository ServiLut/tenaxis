import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenido a Tenaxis</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión o regístrate para continuar.
          </p>
        </div>

        <div className="grid gap-4">
          <Button asChild className="w-full">
            <Link href="/iniciar-sesion">Iniciar Sesión</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/registro">Registrarse</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
