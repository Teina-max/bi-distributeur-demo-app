import { Typography } from "@/components/nowts/typography";
import { SignInWithEmailOTP } from "./_components/sign-in-otp-form";
import { SignInPasswordForm } from "./_components/sign-in-password-form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const SignInCredentialsAndEmailOTP = (props: {
  callbackUrl: string;
  email?: string;
}) => {
  const [isUsingCredentials, setIsUsingCredentials] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("sign-in-with-credentials");
    return stored === null ? true : stored === "true";
  });

  const updateAuthMode = (nextValue: boolean) => {
    setIsUsingCredentials(nextValue);
    window.localStorage.setItem("sign-in-with-credentials", String(nextValue));
  };

  return (
    <div className="max-w-lg space-y-4">
      {DEMO_MODE ? (
        <div className="rounded-md border border-amber-300/40 bg-amber-50/40 p-3 text-xs dark:border-amber-300/30 dark:bg-amber-300/5">
          <Typography variant="small" className="font-semibold">
            Demo publique
          </Typography>
          <Typography variant="muted" className="mt-1">
            Aucun compte ?{" "}
            <Link to="/auth/signup" className="underline">
              Créez-en un en 10 secondes
            </Link>{" "}
            avec n'importe quel email + un mot de passe — vous arrivez direct
            sur le dashboard avec 17 ans de données fictives à explorer.
          </Typography>
        </div>
      ) : null}

      {isUsingCredentials ? (
        <>
          <SignInPasswordForm
            callbackUrl={props.callbackUrl}
            email={props.email}
          />
          <Typography variant="muted" className="text-xs">
            Préférez un code à usage unique ?{" "}
            <Typography
              variant="link"
              as="button"
              type="button"
              onClick={() => updateAuthMode(false)}
            >
              Recevoir un OTP par email
            </Typography>
          </Typography>
        </>
      ) : (
        <>
          <SignInWithEmailOTP
            callbackUrl={props.callbackUrl}
            email={props.email}
          />
          <Typography variant="muted" className="text-xs">
            Préférez un mot de passe ?{" "}
            <Typography
              variant="link"
              as="button"
              type="button"
              onClick={() => updateAuthMode(true)}
            >
              Se connecter avec password
            </Typography>
          </Typography>
        </>
      )}
    </div>
  );
};
