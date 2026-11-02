import { useState, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GENERIC_ERROR } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

function authErrorMessage(error: { status: number; message?: string }) {
  return error.status >= 400 && error.status < 500 && error.message
    ? error.message
    : GENERIC_ERROR;
}

type AuthFormProps = {
  onSignedIn?: () => void;
};

export function AuthForm({ onSignedIn }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const signingIn = mode === 'sign-in';

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);

    const { error } = signingIn
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: window.location.origin,
        });

    setPending(false);
    if (error) setError(authErrorMessage(error));
    else if (signingIn) onSignedIn?.();
    else setSent(true);
  };

  const signInWithGoogle = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    });
    if (error) setError(authErrorMessage(error));
  };

  if (sent) {
    return (
      <p className="text-sm">
        Check your email to confirm your account. We'll sign you in
        automatically.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        {!signingIn && (
          <Field>
            <FieldLabel htmlFor="auth-name">Name</FieldLabel>
            <Input
              id="auth-name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="auth-password">Password</FieldLabel>
          <Input
            id="auth-password"
            type="password"
            required
            minLength={8}
            autoComplete={signingIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Field>
          <Button type="submit" disabled={pending}>
            {signingIn ? 'Sign in' : 'Sign up'}
          </Button>
          <Button type="button" variant="outline" onClick={signInWithGoogle}>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => setMode(signingIn ? 'sign-up' : 'sign-in')}
          >
            {signingIn ? 'No account? Sign up' : 'Have an account? Sign in'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
