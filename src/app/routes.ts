import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { InstitutionRegister } from "./pages/InstitutionRegister";
import { Dashboard } from "./pages/Dashboard";
import { CatDetail } from "./pages/CatDetail";
import { Game } from "./pages/Game";
import { Gacha } from "./pages/Gacha";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/institution/register",
    Component: InstitutionRegister,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/cat/:id",
    Component: CatDetail,
  },
  {
    path: "/game/:catId",
    Component: Game,
  },
  {
    path: "/gacha",
    Component: Gacha,
  },
]);
