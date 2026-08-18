export const SECRET_PARAM_KEYS = ["secret", "code", "key", "otp", "totp"] as const;

export function pathFromLocation(pathname: string, baseUrl: string): string {
  let path = pathname || "/";
  let base = baseUrl || "/";
  if (base === "./") base = "/";
  base = base.replace(/\/$/, "");
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "");
  return path || "/";
}

function firstParam(params: URLSearchParams): string | null {
  for (const key of SECRET_PARAM_KEYS) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
}

export function extractUrlSecret(
  loc: Pick<Location, "hash" | "search" | "pathname">,
  reserved: Set<string>,
  baseUrl: string,
): { secret: string; source: "hash" | "query" | "path" } | null {
  const hashRaw = loc.hash.startsWith("#") ? loc.hash.slice(1) : loc.hash;
  if (hashRaw) {
    if (hashRaw.includes("=")) {
      const fromHash = firstParam(new URLSearchParams(hashRaw));
      if (fromHash) return { secret: fromHash, source: "hash" };
    } else {
      try {
        const bare = decodeURIComponent(hashRaw);
        if (bare) return { secret: bare, source: "hash" };
      } catch {
        return { secret: hashRaw, source: "hash" };
      }
    }
  }

  const fromQuery = firstParam(new URLSearchParams(loc.search));
  if (fromQuery) return { secret: fromQuery, source: "query" };

  const path = pathFromLocation(loc.pathname, baseUrl);
  if (path !== "/" && !reserved.has(path)) {
    const candidate = path.slice(1);
    if (candidate && !candidate.includes("/")) {
      try {
        return { secret: decodeURIComponent(candidate), source: "path" };
      } catch {
        return { secret: candidate, source: "path" };
      }
    }
  }
  return null;
}
