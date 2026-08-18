import { EXTRA_RESERVED, type RouteDef } from "./routes-types";
import { HOME_ROUTE } from "./pages-home";
import { SITEMAP_ROUTE } from "./pages-meta-sitemap";
import { PRIVACY_ROUTE } from "./pages-meta-privacy";
import { ABOUT_ROUTE } from "./pages-meta-about";
import { GUIDE_ROUTES } from "./pages-guides";
import { GUIDE_ROUTES_B } from "./pages-guides-b";
import { GUIDE_ROUTES_C } from "./pages-guides-c";
import { TOOL_ROUTES_A } from "./pages-tools-a";
import { TOOL_ROUTES_B } from "./pages-tools-b";
import { TOOL_ROUTES_C } from "./pages-tools-c";
import { TOOL_ROUTES_D } from "./pages-tools-d";
import { TOOL_ROUTES_E } from "./pages-tools-e";
import { TOOL_ROUTES_F } from "./pages-tools-f";
import { TOOL_ROUTES_G } from "./pages-tools-g";

export type { RouteDef, TotpDefaults, FaqItem, RouteKind } from "./routes-types";
export { pickText, pickFaq } from "./routes-types";

export const ROUTES: RouteDef[] = [
  HOME_ROUTE,
  SITEMAP_ROUTE,
  PRIVACY_ROUTE,
  ABOUT_ROUTE,
  ...GUIDE_ROUTES,
  ...GUIDE_ROUTES_B,
  ...GUIDE_ROUTES_C,
  ...TOOL_ROUTES_A,
  ...TOOL_ROUTES_B,
  ...TOOL_ROUTES_C,
  ...TOOL_ROUTES_D,
  ...TOOL_ROUTES_E,
  ...TOOL_ROUTES_F,
  ...TOOL_ROUTES_G,
];

export function allRoutes(): RouteDef[] {
  return ROUTES;
}

export function reservedPathSet(): Set<string> {
  const set = new Set<string>(EXTRA_RESERVED);
  for (const route of ROUTES) set.add(route.path);
  return set;
}

export function findRoute(path: string): RouteDef | undefined {
  return ROUTES.find((r) => r.path === path);
}
