import React from 'react';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

function SignIn() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ClerkSignIn 
          appearance={{
            baseTheme: undefined,
            elements: {
              rootBox: "mx-auto",
              card: "bg-zinc-900 shadow-xl",
            }
          }}
          afterSignInUrl="/onboarding"
          afterSignUpUrl="/onboarding"
          redirectUrl="/onboarding"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}

export default SignIn;