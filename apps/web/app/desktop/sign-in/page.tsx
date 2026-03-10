'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeDesktopAuth, getMe } from '../../../lib/auth';

function DesktopSignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [message, setMessage] = useState('Checking browser session...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!attemptId) {
        if (!active) {
          return;
        }
        setError('Missing desktop auth attempt id.');
        setMessage('Desktop sign-in could not start.');
        return;
      }

      try {
        const user = await getMe();
        if (!user) {
          router.replace(`/login?${new URLSearchParams({
            next: `/desktop/sign-in?attemptId=${attemptId}`,
          }).toString()}`);
          return;
        }

        if (!active) {
          return;
        }

        setMessage(`Signed in as ${user.email}. Completing desktop sign-in...`);

        const completion = await completeDesktopAuth(attemptId);
        const redirectUrl = new URL(completion.callbackUrl);
        redirectUrl.searchParams.set('handoffToken', completion.handoffToken);
        redirectUrl.searchParams.set('state', completion.state);
        window.location.replace(redirectUrl.toString());
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Desktop sign-in failed');
        setMessage('Desktop sign-in failed.');
      }
    })();

    return () => {
      active = false;
    };
  }, [attemptId, router]);

  return (
    <main style={{ padding: '2rem', maxWidth: '560px', margin: '0 auto' }}>
      <h1>Desktop Sign In</h1>
      <p>{message}</p>
      {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}
    </main>
  );
}

export default function DesktopSignInPage() {
  return (
    <Suspense fallback={
      <main style={{ padding: '2rem', maxWidth: '560px', margin: '0 auto' }}>
        <h1>Desktop Sign In</h1>
        <p>Loading desktop sign-in...</p>
      </main>
    }>
      <DesktopSignInPageContent />
    </Suspense>
  );
}
