import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCKa9zvZfJIgfempwIbBemrXNxa_rRvl-E",
  authDomain: "legal-research-tool-509320.firebaseapp.com",
  projectId: "legal-research-tool-509320",
  storageBucket: "legal-research-tool-509320.firebasestorage.app",
  messagingSenderId: "256323345647",
  appId: "1:256323345647:web:3da0623f5316c8fa538f1a",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google sign-in in a popup; where the browser blocks popups (in-app browsers
// such as Instagram's or WhatsApp's, some phones) fall back to a full-page redirect.
const REDIRECT_CODES = ["auth/popup-blocked", "auth/operation-not-supported-in-environment", "auth/web-storage-unsupported"];
export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (REDIRECT_CODES.includes(err?.code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

// What went wrong, in words, with Firebase's code so a report can be traced.
export function signInErrorMessage(err) {
  const code = err?.code || "";
  if (code.includes("wrong-password") || code.includes("invalid-credential") || code.includes("invalid-login-credentials")) return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("email-already-in-use")) return "An account with that email already exists.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email.";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) return "";
  if (code.includes("network-request-failed")) return "Couldn't reach Google sign-in. Check your connection, or turn off any ad or tracker blocker for this site, then try again.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a few minutes, then try again.";
  if (code.includes("unauthorized-domain")) return "Sign-in isn't enabled on this web address. Open asknyaya.in directly and try again.";
  if (code.includes("user-disabled")) return "This account has been disabled.";
  return `Sign-in didn't work (${code || err?.message || "unknown error"}). Please try again, or use email instead.`;
}
