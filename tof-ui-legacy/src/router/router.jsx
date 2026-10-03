import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";

import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";

import Login from "../pages/Login";

// Public pages
import Duyurular from "../pages/public/Duyurular";
import Haberler from "../pages/public/Haberler";
import FaaliyetTakvimi from "../pages/public/FaaliyetTakvimi";
import Iletisim from "../pages/public/Iletisim";

import KurumsalFederasyonumuz from "../pages/public/Kurumsal/KurumsalFederasyonumuz";
import KurumsalHakemlerimiz from "../pages/public/Kurumsal/KurumsalHakemlerimiz";
import KurumsalAntrenorlerimiz from "../pages/public/Kurumsal/KurumsalAntrenorlerimiz";
import KurumsalKuluplerimiz from "../pages/public/Kurumsal/KurumsalKuluplerimiz";

import YarismaBulteni from "../pages/public/YarismaBulteni";
import YarismaKayit from "../pages/public/YarismaKayit";
import Yarismacilar from "../pages/public/Yarismacilar";

import Sonuclar from "../pages/public/Results/Sonuclar";
import CanliSonuclar from "../pages/public/Results/CanliSonuclar";
import AraSonuclar from "../pages/public/Results/AraSonuclar";


import NotFound from "../pages/public/NotFound";

// App pages (protected)
import Dashboard from "../pages/app/Dashboard";
import Events from "../pages/app/Events/Events";
import Athletes from "../pages/app/Athletes/Athletes";
import ChangePassword from "../pages/app/ChangePassword";


export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  // Public site
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/duyurular" replace /> },

      { path: "duyurular", element: <Duyurular /> },
      { path: "haberler", element: <Haberler /> },
      { path: "faaliyet-takvimi", element: <FaaliyetTakvimi /> },
      { path: "iletisim", element: <Iletisim /> },
      { path: "events", element: <Events /> },
      { path: "sonuclar", element: <Sonuclar /> },
      { path: "sonuclar/ara", element: <AraSonuclar /> },
      { path: "sonuclar/canli", element: <CanliSonuclar /> },


      { path: "kurumsal/federasyonumuz", element: <KurumsalFederasyonumuz /> },
      { path: "kurumsal/hakemlerimiz", element: <KurumsalHakemlerimiz /> },
      { path: "kurumsal/antrenorlerimiz", element: <KurumsalAntrenorlerimiz /> },
      { path: "kurumsal/kuluplerimiz", element: <KurumsalKuluplerimiz /> },

      { path: "yarisma-basvurulari/yarisma-bulteni", element: <YarismaBulteni /> },
      { path: "yarisma-basvurulari/kayit", element: <YarismaKayit /> },
      { path: "yarisma-basvurulari/yarismacilar", element: <Yarismacilar /> },
    ],
  },

  // Panel (protected)
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "events", element: <Events /> },
      { path: "athletes", element: <Athletes /> },
      { path: "change-password", element: <ChangePassword /> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
