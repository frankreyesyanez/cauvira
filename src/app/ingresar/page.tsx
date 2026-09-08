import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <p className="sign-in__brand">
        <Link href="/">Cauvira</Link>
        <small>Control comercial</small>
      </p>
      <header className="sign-in__header">
        <p className="ui-eyebrow">Operación interna</p>
        <h1>Ingresar</h1>
        <p>
          Accede al backoffice para operar catálogo, precios y seguimiento
          comercial. Esta pantalla no crea cuentas de cliente.
        </p>
      </header>
      <SignInForm />
    </main>
  );
}
