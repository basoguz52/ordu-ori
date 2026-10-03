import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Shield,
  Newspaper,
  UserCog,
  KeyRound,
  Building2,
  Images,
  ClipboardList,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface DashboardCard {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  show: boolean;
}

export default function Dashboard() {
  const { user, isAdmin, isClubManager, isReferee } = useAuth();

  // Bölümler panel menüsündeki gruplarla aynı: Yarışmalar · Yönetim · İçerik · Hesabım
  const sections: { title: string; cards: DashboardCard[] }[] = [
    {
      title: "Yarışmalar",
      cards: [
        {
          to: "/app/etkinlikler",
          icon: CalendarDays,
          title: "Etkinlikler",
          desc: "Yarışları görüntüle ve yönet.",
          show: isAdmin,
        },
        {
          to: "/app/sporcular",
          icon: Users,
          title: "Sporcular",
          desc: "Kulübünün sporcularını yönet.",
          show: isClubManager,
        },
        {
          to: "/app/kayit",
          icon: ClipboardList,
          title: "Yarış Kaydı",
          desc: "Sporcularını yarışlara kaydet.",
          show: isClubManager,
        },
      ],
    },
    {
      title: "Yönetim",
      cards: [
        {
          to: "/app/kulupler",
          icon: Building2,
          title: "Kulüpler",
          desc: "Tüm kulüpleri yönet, yönetici ata.",
          show: isAdmin,
        },
        {
          to: "/app/tum-sporcular",
          icon: Users,
          title: "Tüm Sporcular",
          desc: "Tüm kulüplerin sporcularını yönet.",
          show: isAdmin,
        },
        {
          to: "/app/kullanicilar",
          icon: UserCog,
          title: "Kullanıcılar",
          desc: "Kayıt onayları ve roller.",
          show: isAdmin,
        },
        {
          to: "/app/ayarlar",
          icon: SettingsIcon,
          title: "Ayarlar",
          desc: "Sonuç yükleme (FTP) bilgileri.",
          show: isAdmin,
        },
      ],
    },
    {
      title: "İçerik",
      cards: [
        {
          to: "/app/icerik",
          icon: Newspaper,
          title: "Duyuru, Haber & Sayfalar",
          desc: "Duyuru, haber ve kurumsal sayfalar.",
          show: isAdmin,
        },
        {
          to: "/app/carousel",
          icon: Images,
          title: "Anasayfa Görselleri",
          desc: "Anasayfa galerisini düzenle.",
          show: isAdmin,
        },
      ],
    },
    {
      title: "Hesabım",
      cards: [
        {
          to: "/app/profil",
          icon: Building2,
          title: "Profilim",
          desc: "Kişisel bilgiler ve kulüp tanıtımı.",
          show: isClubManager,
        },
        {
          to: "/app/hakem",
          icon: Shield,
          title: "Hakem Profilim",
          desc: "Profil ve görev tercihlerin.",
          show: isReferee || isAdmin,
        },
        {
          to: "/app/sifre-degistir",
          icon: KeyRound,
          title: "Şifre Değiştir",
          desc: "Hesap şifreni güncelle.",
          show: true,
        },
      ],
    },
  ]
    .map((s) => ({ ...s, cards: s.cards.filter((c) => c.show) }))
    .filter((s) => s.cards.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Merhaba, {user?.full_name} 👋
        </h1>
        <p className="text-muted-foreground">
          {user?.club ? `${user.club.name} · ` : ""}Panele hoş geldin.
        </p>
      </div>

      {sections.map((s) => (
        <section key={s.title} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.cards.map((c) => (
              <Link key={c.to} to={c.to} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                  <CardHeader>
                    <c.icon className="mb-2 size-6 text-primary" />
                    <CardTitle>{c.title}</CardTitle>
                    <CardDescription>{c.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
