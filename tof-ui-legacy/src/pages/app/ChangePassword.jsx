import { useState } from "react";
import { apiClient } from "../../api/apiClient";
import { useAuth } from "../../auth/AuthContext";

export default function ChangePassword() {
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setOk(false);

    if (!current || !next || !confirm) {
      setErr("Tüm alanlar zorunlu.");
      return;
    }
    if (next.length < 8) {
      setErr("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (next !== confirm) {
      setErr("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.changePassword(current, next, confirm);
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e2) {
      setErr(e2?.message || "Şifre değiştirilemedi.");
    } finally {
      setSaving(false);
    }
  }

  // Route zaten auth-guardlı değilse, burada da engelleyebilirsin
  if (!user) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-slate-700 shadow-sm">
        Bu sayfa için giriş yapmalısın.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Şifre Değiştir</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mevcut şifreni doğrulayıp yeni şifre belirleyebilirsin.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Şifren güncellendi.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <label className="block text-sm">
          <div className="mb-1 font-semibold text-slate-700">Mevcut Şifre</div>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={saving}
            autoComplete="current-password"
          />
        </label>

        <label className="block text-sm">
          <div className="mb-1 font-semibold text-slate-700">Yeni Şifre</div>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={saving}
            autoComplete="new-password"
          />
          <div className="mt-1 text-xs text-slate-500">En az 8 karakter.</div>
        </label>

        <label className="block text-sm">
          <div className="mb-1 font-semibold text-slate-700">Yeni Şifre (Tekrar)</div>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={saving}
            autoComplete="new-password"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </div>
  );
}
