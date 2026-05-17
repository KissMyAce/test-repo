import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { AuthState, AuthUser } from "./types";
import { clearPersistedAuthUser, getPersistedAuthUser, persistAuthUser } from "./session";

interface AuthContextValue extends AuthState {
  setSession: (user: AuthUser | null, accessToken?: string | null) => void;
  login: (user: AuthUser, accessToken?: string | null) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  fetchMe: () => Promise<AuthUser | null>;
}

interface RefreshResponse {
  accessToken?: string;
  user?: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((nextUser: AuthUser | null, nextAccessToken?: string | null) => {
    setUser(nextUser);

    if (typeof nextAccessToken !== "undefined") {
      setAccessToken(nextAccessToken);
    }

    if (nextUser) {
      persistAuthUser(nextUser);
    } else {
      clearPersistedAuthUser();
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const payload = await apiClient.post<RefreshResponse>("/auth/refresh", {});

      if (payload.accessToken) {
        setAccessToken(payload.accessToken);
      }

      if (payload.user) {
        setSession(payload.user);
      }

      return Boolean(payload.accessToken || payload.user);
    } catch {
      return false;
    }
  }, [setSession]);

  const fetchMe = useCallback(async () => {
    try {
      const payload = await apiClient.get<MeResponse>("/auth/me");
      setSession(payload.user);
      return payload.user;
    } catch {
      return null;
    }
  }, [setSession]);

  const login = useCallback(
    (nextUser: AuthUser, token?: string | null) => {
      setSession(nextUser, token);
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch {
      // noop for now, local logout still proceeds.
    }
    setAccessToken(null);
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    apiClient.setTokenGetter(() => accessToken);
    apiClient.setUnauthorizedHandler(refresh);
  }, [accessToken, refresh]);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const localUser = getPersistedAuthUser();
      if (localUser && mounted) {
        setUser(localUser);
      }

      const refreshed = await refresh();
      if (!refreshed && mounted) {
        // Prevent stale local user from appearing authenticated without a valid access token.
        setAccessToken(null);
        setSession(null);
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [refresh, setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(user),
      setSession,
      login,
      logout,
      refresh,
      fetchMe,
    }),
    [accessToken, fetchMe, isLoading, login, logout, refresh, setSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
