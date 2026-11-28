import { createBrowserRouter } from "react-router-dom";
import { lazyWithReload } from "@/lib/lazyWithReload";
import type { RouteHandle } from "@/lib/usePageTitle";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute, RoleGate } from "@/auth/ProtectedRoute";
import Home from "@/pages/public/Home";
import Duyurular from "@/pages/public/Duyurular";
import DuyuruDetay from "@/pages/public/DuyuruDetay";
import Haberler from "@/pages/public/Haberler";
import HaberDetay from "@/pages/public/HaberDetay";
import YarismaBulteni from "@/pages/public/YarismaBulteni";
import Iletisim from "@/pages/public/Iletisim";
import NotFound from "@/pages/NotFound";
import { RouteError } from "@/components/layout/RouteError";

// Sayfa bazlı kod bölme: aşağıdakiler ilk ziyarette indirilir (ana bundle küçük kalır).
const Login = lazyWithReload(() => import("@/pages/Login"));
const Kayit = lazyWithReload(() => import("@/pages/Kayit"));
const SifremiUnuttum = lazyWithReload(() => import("@/pages/SifremiUnuttum"));
const SifreSifirla = lazyWithReload(() => import("@/pages/SifreSifirla"));
const Yarismacilar = lazyWithReload(() => import("@/pages/public/Yarismacilar"));
const YarismaKayit = lazyWithReload(() => import("@/pages/public/YarismaKayit"));
const Sonuclar = lazyWithReload(() => import("@/pages/public/Sonuclar"));
const PuanTablosu = lazyWithReload(() => import("@/pages/public/PuanTablosu"));
const SezonPuanTablosu = lazyWithReload(() => import("@/pages/public/SezonPuanTablosu"));
const FaaliyetTakvimi = lazyWithReload(() => import("@/pages/public/FaaliyetTakvimi"));
const IlTemsilciligi = lazyWithReload(() => import("@/pages/public/kurumsal/IlTemsilciligi"));
const Hakemlerimiz = lazyWithReload(() => import("@/pages/public/kurumsal/Hakemlerimiz"));
const Kuluplerimiz = lazyWithReload(() => import("@/pages/public/kurumsal/Kuluplerimiz"));
const Federasyonumuz = lazyWithReload(() => import("@/pages/public/kurumsal/Federasyonumuz"));
const Antrenorlerimiz = lazyWithReload(() => import("@/pages/public/kurumsal/Antrenorlerimiz"));
const Dashboard = lazyWithReload(() => import("@/pages/app/Dashboard"));
const EventsAdmin = lazyWithReload(() => import("@/pages/app/EventsAdmin"));
const EventForm = lazyWithReload(() => import("@/pages/app/EventForm"));
const EventRegistrations = lazyWithReload(() => import("@/pages/app/EventRegistrations"));
const EventFiles = lazyWithReload(() => import("@/pages/app/EventFiles"));
const Users = lazyWithReload(() => import("@/pages/app/Users"));
const Athletes = lazyWithReload(() => import("@/pages/app/Athletes"));
const YarisKaydi = lazyWithReload(() => import("@/pages/app/Kayit"));
const Content = lazyWithReload(() => import("@/pages/app/Content"));
const Settings = lazyWithReload(() => import("@/pages/app/Settings"));
const CarouselAdmin = lazyWithReload(() => import("@/pages/app/CarouselAdmin"));
const RefereeProfilePage = lazyWithReload(() => import("@/pages/app/RefereeProfile"));
const ChangePassword = lazyWithReload(() => import("@/pages/app/ChangePassword"));
const ClubProfilePage = lazyWithReload(() => import("@/pages/app/ClubProfile"));
const AdminClubs = lazyWithReload(() => import("@/pages/app/AdminClubs"));
const AdminAthletes = lazyWithReload(() => import("@/pages/app/AdminAthletes"));

/** Sekme başlığı: `<başlık> | Ordu Oryantiring` (bkz. components/layout/PageTitle). */
const h = (title: string): RouteHandle => ({ title });

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/giris", handle: h("Giriş"), element: <Login /> },
      { path: "/kayit", handle: h("Kayıt Ol"), element: <Kayit /> },
      { path: "/sifremi-unuttum", handle: h("Şifremi Unuttum"), element: <SifremiUnuttum /> },
      { path: "/sifre-sifirla", handle: h("Yeni Şifre Belirle"), element: <SifreSifirla /> },
      { path: "/duyurular", handle: h("Duyurular"), element: <Duyurular /> },
      { path: "/duyurular/:slug", handle: h("Duyurular"), element: <DuyuruDetay /> },
      { path: "/haberler", handle: h("Haberler"), element: <Haberler /> },
      { path: "/haberler/:slug", handle: h("Haberler"), element: <HaberDetay /> },
      { path: "/yarisma-bulteni", handle: h("Yarışmalar"), element: <YarismaBulteni /> },
      { path: "/yarismacilar", handle: h("Yarışmacılar"), element: <Yarismacilar /> },
      { path: "/yarisma-kayit", handle: h("Yarışma Kaydı"), element: <YarismaKayit /> },
      { path: "/iletisim", handle: h("İletişim"), element: <Iletisim /> },
      { path: "/sonuclar", handle: h("Sonuçlar"), element: <Sonuclar /> },
      { path: "/sonuclar/sezon", handle: h("Sezon Puan Tablosu"), element: <SezonPuanTablosu /> },
      { path: "/sonuclar/:id", handle: h("Puan Tablosu"), element: <PuanTablosu /> },
      { path: "/faaliyet-takvimi", handle: h("Faaliyet Takvimi"), element: <FaaliyetTakvimi /> },
      { path: "/kurumsal/il-temsilciligi", handle: h("İl Temsilciliği"), element: <IlTemsilciligi /> },
      { path: "/kurumsal/hakemlerimiz", handle: h("Hakemlerimiz"), element: <Hakemlerimiz /> },
      { path: "/kurumsal/kuluplerimiz", handle: h("Kulüplerimiz"), element: <Kuluplerimiz /> },
      { path: "/kurumsal/federasyonumuz", handle: h("Federasyonumuz"), element: <Federasyonumuz /> },
      { path: "/kurumsal/antrenorlerimiz", handle: h("Antrenörlerimiz"), element: <Antrenorlerimiz /> },
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, handle: h("Panel"), element: <Dashboard /> },
      {
        path: "etkinlikler", handle: h("Etkinlikler"),
        element: (
          <RoleGate need="admin">
            <EventsAdmin />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/yeni", handle: h("Yeni Etkinlik"),
        element: (
          <RoleGate need="admin">
            <EventForm />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id", handle: h("Etkinlik Düzenle"),
        element: (
          <RoleGate need="admin">
            <EventForm />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id/dosyalar", handle: h("Etkinlik Dosyaları"),
        element: (
          <RoleGate need="admin">
            <EventFiles />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id/kayitlar", handle: h("Etkinlik Kayıtları"),
        element: (
          <RoleGate need="admin">
            <EventRegistrations />
          </RoleGate>
        ),
      },
      {
        path: "sporcular", handle: h("Sporcular"),
        element: (
          <RoleGate need="manage-athletes">
            <Athletes />
          </RoleGate>
        ),
      },
      {
        path: "kayit", handle: h("Yarış Kaydı"),
        element: (
          <RoleGate need="manage-athletes">
            <YarisKaydi />
          </RoleGate>
        ),
      },
      {
        path: "icerik", handle: h("İçerik"),
        element: (
          <RoleGate need="admin">
            <Content />
          </RoleGate>
        ),
      },
      {
        path: "carousel", handle: h("Ana Sayfa Görselleri"),
        element: (
          <RoleGate need="admin">
            <CarouselAdmin />
          </RoleGate>
        ),
      },
      {
        path: "hakem", handle: h("Hakem Profili"),
        element: (
          <RoleGate need="referee">
            <RefereeProfilePage />
          </RoleGate>
        ),
      },
      {
        path: "profil", handle: h("Kulüp Profili"),
        element: (
          <RoleGate need="club-manager">
            <ClubProfilePage />
          </RoleGate>
        ),
      },
      { path: "sifre-degistir", handle: h("Şifre Değiştir"), element: <ChangePassword /> },
      {
        path: "kulupler", handle: h("Kulüpler"),
        element: (
          <RoleGate need="admin">
            <AdminClubs />
          </RoleGate>
        ),
      },
      {
        path: "tum-sporcular", handle: h("Tüm Sporcular"),
        element: (
          <RoleGate need="admin">
            <AdminAthletes />
          </RoleGate>
        ),
      },
      {
        path: "kullanicilar", handle: h("Kullanıcılar"),
        element: (
          <RoleGate need="admin">
            <Users />
          </RoleGate>
        ),
      },
      {
        path: "ayarlar", handle: h("Ayarlar"),
        element: (
          <RoleGate need="admin">
            <Settings />
          </RoleGate>
        ),
      },
    ],
  },
  { path: "*", handle: h("Sayfa Bulunamadı"), element: <NotFound /> },
]);
