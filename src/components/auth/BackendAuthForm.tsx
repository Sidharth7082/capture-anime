import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendAuth } from "@/hooks/use-backend-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type Mode = "signin" | "register";

/**
 * Login / register against the anime backend (JWT). Syncs favorites, watch
 * history and continue-watching across devices. This is the app's single
 * authentication system.
 */
export function BackendAuthForm() {
  const navigate = useNavigate();
  const { login, register } = useBackendAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const busy = login.isPending || register.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signin") {
      if (!identifier.trim() || !password) {
        setError("Enter your username/email and password.");
        return;
      }
      login.mutate(
        { identifier: identifier.trim(), password },
        {
          onSuccess: () => {
            toast({ title: "Signed in", description: "Favorites & history are now synced." });
            navigate("/");
          },
          onError: (err) => setError((err as Error).message),
        },
      );
    } else {
      if (!username.trim() || !email.trim() || password.length < 8) {
        setError("Username, a valid email, and a password of at least 8 characters are required.");
        return;
      }
      register.mutate(
        { username: username.trim(), email: email.trim(), password },
        {
          onSuccess: () => {
            toast({ title: "Account created", description: "Welcome!" });
            navigate("/");
          },
          onError: (err) => setError((err as Error).message),
        },
      );
    }
  };

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <CardShell>
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold text-zinc-900">CaptureOrDie Account</h2>
        <p className="text-xs text-zinc-500">
          Sync favorites, watch history and continue watching across devices.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-lg border border-zinc-200 p-1 text-sm font-semibold">
        {(["signin", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={cnTab(mode === m)}
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signin" ? (
          <input
            className={inputCls}
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        ) : (
          <>
            <input
              className={inputCls}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className={inputCls}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </>
        )}
        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </CardShell>
  );
}

// Small helpers so the form stays in one file.
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-lg">
      {children}
    </div>
  );
}

function cnTab(active: boolean): string {
  return active
    ? "rounded-md bg-purple-600 py-1.5 text-white"
    : "py-1.5 text-zinc-500 hover:text-zinc-800";
}
