"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const result = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setPending(false);

    if (result.error) {
      setError("No fue posible ingresar. Revisa el correo y la contraseña.");
      return;
    }

    router.push("/backoffice/catalogo");
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      {error ? (
        <div className="ui-alert ui-alert--urgent" role="alert">
          <span aria-hidden="true" className="ui-icon">
            !
          </span>
          <p>{error}</p>
        </div>
      ) : null}
      <fieldset className="admin-form__section">
        <legend>Credenciales</legend>
        <div className="admin-form__grid admin-form__grid--stack">
          <Field
            autoComplete="email"
            description="Usa la cuenta de operación asignada por Cauvira."
            label="Correo electrónico"
            name="email"
            required
            type="email"
          />
          <Field
            autoComplete="current-password"
            description="Contraseña de acceso interno. No es un portal de clientes."
            label="Contraseña"
            name="password"
            required
            type="password"
          />
        </div>
      </fieldset>
      <div className="admin-form__footer">
        <p className="admin-form__note">Acceso restringido al equipo interno.</p>
        <Button loading={pending} type="submit">
          Ingresar
        </Button>
      </div>
    </form>
  );
}
