import { Typography } from "@/components/nowts/typography";
import { SignInWithEmailOTP } from "./_components/sign-in-otp-form";
import { SignInPasswordForm } from "./_components/sign-in-password-form";
import { useState } from "react";

export const SignInCredentialsAndEmailOTP = (props: {
  callbackUrl: string;
  email?: string;
}) => {
  const [isUsingCredentials, setIsUsingCredentials] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("sign-in-with-credentials");
    return stored === "true";
  });

  const updateAuthMode = (nextValue: boolean) => {
    setIsUsingCredentials(nextValue);
    window.localStorage.setItem("sign-in-with-credentials", String(nextValue));
  };

  return (
    <div className="max-w-lg space-y-4">
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
