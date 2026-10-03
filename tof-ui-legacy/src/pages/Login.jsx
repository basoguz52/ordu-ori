import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/app";

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError("Giriş bilgileri hatalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Giriş</h1>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">E-posta</span>
            <input
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
              // value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Şifre</span>
            <input
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
              type="password"
              // value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş"}
          </button>


          <p className="text-xs text-slate-500"><a href="/iletisim">Şifremi Unuttum</a></p>
        </form>
      </div>
    </div>
  );
}
