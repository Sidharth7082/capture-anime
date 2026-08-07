import { Link } from "react-router-dom";
import { BackendAuthForm } from "@/components/auth/BackendAuthForm";

/**
 * Authentication page. There is exactly ONE auth system: the CaptureOrDie
 * Express backend (JWT). No Supabase, no edge functions.
 */
const AuthPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90 p-4 gap-4">
      <BackendAuthForm />
      <p className="text-xs text-zinc-500">
        <Link to="/" className="underline hover:text-purple-600">
          ← Back to home
        </Link>
      </p>
    </div>
  );
};

export default AuthPage;
