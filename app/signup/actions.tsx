'use server';
import { redirect } from 'next/navigation';

// Mirrors the backend's RegisterRequestDTO @Pattern constraint so obviously
// non-compliant passwords fail fast without a network round trip.
const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;

export type RegisterErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export type RegisterResult = {
  errors?: RegisterErrors;
};

export async function registerHandler(
  prevState: RegisterResult | null,
  formData: FormData
): Promise<RegisterResult | null> {
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirm-password');

  if (typeof password === 'string' && !PASSWORD_COMPLEXITY_PATTERN.test(password)) {
    return {
      errors: {
        password: 'Password must contain at least one uppercase letter, one number, and one symbol',
      },
    };
  }

  if (password !== confirmPassword) {
    return { errors: { confirmPassword: 'Passwords do not match' } };
  }

  const response = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    return { errors: await extractFieldErrors(response) };
  }

  // Account exists but isn't usable yet — no tokens are issued until the
  // verification link is clicked, so there's nothing to log in with here.
  redirect(`/signup/check-email?email=${encodeURIComponent(typeof email === 'string' ? email : '')}`);
}

// Backend errors come as either { message } (auth errors) or
// { message: "Validation failed", errors: { field: message } } (bean validation
// and, since UserAlreadyExistsException now carries a field, username/email
// conflicts too). Map field errors straight through so the form can show them
// next to the right input instead of one generic banner.
async function extractFieldErrors(response: Response): Promise<RegisterErrors> {
  try {
    const data = await response.json();
    if (data?.errors && typeof data.errors === 'object') {
      return data.errors as RegisterErrors;
    }
    if (typeof data?.message === 'string') {
      return { general: data.message };
    }
  } catch {
    // Response wasn't JSON — fall through to the generic message below.
  }
  return { general: 'Something went wrong. Please try again.' };
}
