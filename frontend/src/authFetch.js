import { auth } from "./firebase";

/**
 * A fetch wrapper that automatically attaches the signed-in user's Firebase
 * ID token as a Bearer token, for calling your own authenticated backend
 * endpoints (/history, /favorites). Returns null if nobody is signed in,
 * so callers can just skip the action silently rather than erroring.
 */
export async function authFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
