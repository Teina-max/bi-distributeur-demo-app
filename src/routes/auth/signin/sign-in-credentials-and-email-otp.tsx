import { Typography } from "@/components/nowts/typography";
import { SignInPasswordForm } from "./_components/sign-in-password-form";
import { Link } from "@tanstack/react-router";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const SignInCredentialsAndEmailOTP = (props: {
  callbackUrl: string;
  email?: string;
}) => {
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
            L'envoi d'OTP par email n'est pas activé sur cette démo.
          </Typography>
        </div>
      ) : null}
      <SignInPasswordForm callbackUrl={props.callbackUrl} email={props.email} />
    </div>
  );
};
