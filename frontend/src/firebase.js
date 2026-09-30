import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
