import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute, RoleGate } from "@/auth/ProtectedRoute";
import Home from "@/pages/public/Home";
import Login from "@/pages/Login";
import Kayit from "@/pages/Kayit";
import Duyurular from "@/pages/public/Duyurular";
import DuyuruDetay from "@/pages/public/DuyuruDetay";
import Haberler from "@/pages/public/Haberler";
import HaberDetay from "@/pages/public/HaberDetay";
import YarismaBulteni from "@/pages/public/YarismaBulteni";
import Yarismacilar from "@/pages/public/Yarismacilar";
import YarismaKayit from "@/pages/public/YarismaKayit";
import Iletisim from "@/pages/public/Iletisim";
import Sonuclar from "@/pages/public/Sonuclar";
import FaaliyetTakvimi from "@/pages/public/FaaliyetTakvimi";
import IlTemsilciligi from "@/pages/public/kurumsal/IlTemsilciligi";
import Hakemlerimiz from "@/pages/public/kurumsal/Hakemlerimiz";
import Kuluplerimiz from "@/pages/public/kurumsal/Kuluplerimiz";
import Federasyonumuz from "@/pages/public/kurumsal/Federasyonumuz";
import Antrenorlerimiz from "@/pages/public/kurumsal/Antrenorlerimiz";
import Dashboard from "@/pages/app/Dashboard";
import EventsAdmin from "@/pages/app/EventsAdmin";
import EventForm from "@/pages/app/EventForm";
import EventRegistrations from "@/pages/app/EventRegistrations";
import EventFiles from "@/pages/app/EventFiles";
import Users from "@/pages/app/Users";
import Athletes from "@/pages/app/Athletes";
import YarisKaydi from "@/pages/app/Kayit";
import Content from "@/pages/app/Content";
import Settings from "@/pages/app/Settings";
import CarouselAdmin from "@/pages/app/CarouselAdmin";
import RefereeProfilePage from "@/pages/app/RefereeProfile";
import ChangePassword from "@/pages/app/ChangePassword";
import ClubProfilePage from "@/pages/app/ClubProfile";
import AdminClubs from "@/pages/app/AdminClubs";
import AdminAthletes from "@/pages/app/AdminAthletes";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/giris", element: <Login /> },
      { path: "/kayit", element: <Kayit /> },
      { path: "/duyurular", element: <Duyurular /> },
      { path: "/duyurular/:slug", element: <DuyuruDetay /> },
      { path: "/haberler", element: <Haberler /> },
      { path: "/haberler/:slug", element: <HaberDetay /> },
      { path: "/yarisma-bulteni", element: <YarismaBulteni /> },
      { path: "/yarismacilar", element: <Yarismacilar /> },
      { path: "/yarisma-kayit", element: <YarismaKayit /> },
      { path: "/iletisim", element: <Iletisim /> },
      { path: "/sonuclar", element: <Sonuclar /> },
      { path: "/faaliyet-takvimi", element: <FaaliyetTakvimi /> },
      { path: "/kurumsal/il-temsilciligi", element: <IlTemsilciligi /> },
      { path: "/kurumsal/hakemlerimiz", element: <Hakemlerimiz /> },
      { path: "/kurumsal/kuluplerimiz", element: <Kuluplerimiz /> },
      { path: "/kurumsal/federasyonumuz", element: <Federasyonumuz /> },
      { path: "/kurumsal/antrenorlerimiz", element: <Antrenorlerimiz /> },
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "etkinlikler",
        element: (
          <RoleGate need="admin">
            <EventsAdmin />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/yeni",
        element: (
          <RoleGate need="admin">
            <EventForm />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id",
        element: (
          <RoleGate need="admin">
            <EventForm />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id/dosyalar",
        element: (
          <RoleGate need="admin">
            <EventFiles />
          </RoleGate>
        ),
      },
      {
        path: "etkinlikler/:id/kayitlar",
        element: (
          <RoleGate need="admin">
            <EventRegistrations />
          </RoleGate>
        ),
      },
      {
        path: "sporcular",
        element: (
          <RoleGate need="manage-athletes">
            <Athletes />
          </RoleGate>
        ),
      },
      {
        path: "kayit",
        element: (
          <RoleGate need="manage-athletes">
            <YarisKaydi />
          </RoleGate>
        ),
      },
      {
        path: "icerik",
        element: (
          <RoleGate need="admin">
            <Content />
          </RoleGate>
        ),
      },
      {
        path: "carousel",
        element: (
          <RoleGate need="admin">
            <CarouselAdmin />
          </RoleGate>
        ),
      },
      {
        path: "hakem",
        element: (
          <RoleGate need="referee">
            <RefereeProfilePage />
          </RoleGate>
        ),
      },
      {
        path: "profil",
        element: (
          <RoleGate need="club-manager">
            <ClubProfilePage />
          </RoleGate>
        ),
      },
      { path: "sifre-degistir", element: <ChangePassword /> },
      {
        path: "kulupler",
        element: (
          <RoleGate need="admin">
            <AdminClubs />
          </RoleGate>
        ),
      },
      {
        path: "tum-sporcular",
        element: (
          <RoleGate need="admin">
            <AdminAthletes />
          </RoleGate>
        ),
      },
      {
        path: "kullanicilar",
        element: (
          <RoleGate need="admin">
            <Users />
          </RoleGate>
        ),
      },
      {
        path: "ayarlar",
        element: (
          <RoleGate need="admin">
            <Settings />
          </RoleGate>
        ),
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
