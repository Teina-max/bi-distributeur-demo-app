import { SiteConfig } from "@/site-config";
import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SignUpCredentialsForm } from "./sign-up-credentials-form";
import { Typography } from "@/components/nowts/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const Route = createFileRoute("/auth/signup/")({
  validateSearch: z.object({
    callbackUrl: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Sign Up | ${SiteConfig.title}` },
      {
        name: "description",
        content: DEMO_MODE
          ? "Créez un compte demo en 10 secondes pour tester la démo."
          : "Signup is disabled — sign in with an authorized email.",
      },
    ],
  }),
  component: SignupComponent,
});

function SignupComponent() {
  const { callbackUrl } = Route.useSearch();
  if (!DEMO_MODE) {
    return <Navigate to="/auth/signin" replace />;
  }
  return (
    <div className="mx-auto w-full max-w-md py-12 lg:max-w-lg lg:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte demo</CardTitle>
          <Typography variant="muted" className="text-sm">
            Mode démo public. Aucun email d'activation envoyé — tout email
            valide est accepté et vous accédez direct au tenant{" "}
            <code>toscana-beverages-demo</code> avec 17 ans de données fictives.
          </Typography>
        </CardHeader>
        <CardContent>
          <SignUpCredentialsForm callbackUrl={callbackUrl ?? "/app"} />
          <Typography variant="muted" className="mt-4 text-xs">
            Déjà un compte ?{" "}
            <Link to="/auth/signin" className="underline">
              Se connecter
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
