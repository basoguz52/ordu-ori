import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="bg-white border rounded-xl p-4 md:p-6">
      <h1 className="text-lg font-semibold">Panel</h1>
      <p className="text-sm mt-2">Hoş geldiniz, {user?.full_name}.</p>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium">Rol</div>
          <div className="text-sm mt-1">
            {user?.is_club_manager ? "Kulüp Yetkilisi" : user?.is_referee ? "Hakem" : "Kullanıcı"}
          </div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium">Sıradaki</div>
          <div className="text-sm mt-1">Sporcu ekranını ve yarış listelerini ekleyeceğiz.</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium">Durum</div>
          <div className="text-sm mt-1">Şu an mock login çalışıyor.</div>
        </div>
      </div>
    </div>
  );
}
