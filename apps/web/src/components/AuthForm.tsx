import { useState, type SubmitEvent } from 'react';

import { authClient } from '../lib/auth-client';

export default function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);

    const { error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: window.location.origin,
          });

    if (error) setError(error.message ?? 'Something went wrong.');
    else if (mode === 'sign-up') setSent(true);
    setPending(false);
  };

  const google = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    });
    if (error) setError(error.message ?? 'Google sign-in failed.');
  };

  if (sent)
    return (
      <div>
        Check your email to confirm your account. We'll sign you in
        automatically.
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">
        {mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </h1>

      {mode === 'sign-up' && (
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-600 p-1"
        />
      )}
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-gray-600 p-1"
      />
      <input
        required
        type="password"
        minLength={8}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border border-gray-600 p-1"
      />

      {error && <div className="text-red-600">{error}</div>}

      <button type="submit" disabled={pending} className="border p-1">
        {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
      </button>
      <button type="button" onClick={google} className="border p-1">
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        className="text-sm underline"
      >
        {mode === 'sign-in'
          ? 'No account? Sign up'
          : 'Have an account? Sign in'}
      </button>
    </form>
  );
}
