import React from 'react';
import { SignUp as ClerkSignUp } from '@clerk/clerk-react';

function SignUp() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ClerkSignUp 
          appearance={{
            baseTheme: undefined,
            elements: {
              rootBox: "mx-auto",
              card: "bg-zinc-900 shadow-xl",
            }
          }}
          afterSignUpUrl="/onboarding"
          redirectUrl="/onboarding"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}

export default SignUp;
