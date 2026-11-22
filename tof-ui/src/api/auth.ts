import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { User } from "@/types/api";

/** Öz-kayıt gövdesi. Backend: full_name/email/password zorunlu, phone_number opsiyonel. */
export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string;
}

/**
 * Öz-kayıt (kulüp yöneticisi adayı). Başarıda hesap `pending` açılır;
 * admin onaylayana kadar giriş yapılamaz. 201 → { message, user }.
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<{ message: string; user: User }>(
        "/register",
        payload,
      );
      return data;
    },
  });
}

/** Şifre değiştirme gövdesi (backend: hepsi zorunlu; new≥8, new===confirm, new≠current). */
export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

/** POST /api/me/change-password → 204. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      await api.post("/me/change-password", payload);
    },
  });
}

/** POST /api/auth/forgot-password → { ok: true } (hesap olsun olmasın aynı yanıt). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post("/auth/forgot-password", { email });
    },
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  password_confirm: string;
}

/** POST /api/auth/reset-password → 204. Token tek kullanımlık, 1 saat geçerli. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      await api.post("/auth/reset-password", payload);
    },
  });
}
