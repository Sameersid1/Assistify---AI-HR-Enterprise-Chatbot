import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { api, ApiError, tokenStore } from "@/lib/api"
import { ROLE_LABELS, toUser, type LoginResponse, type MeResponse, type User, type UserRole } from "@/lib/types"

export type { UserRole, User }

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  /** True while we restore the session on first load — guards render a spinner until false. */
  isLoading: boolean
  /**
   * `allowedRoles` restricts which accounts may complete this sign-in — the
   * sign-in page passes the roles its selected portal covers. Enforced here so
   * the check happens before any session is stored; see the note in the body.
   */
  login: (
    email: string,
    password: string,
    allowedRoles?: readonly UserRole[],
  ) => Promise<{ success: boolean; error?: string }>
  /**
   * Adopt a session the server already issued — used by activation, which
   * returns tokens directly so the new employee lands in the app without
   * retyping the password they just chose.
   */
  adoptSession: (data: LoginResponse) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore the session on mount: if we hold a token, ask the server who we are.
  // The server is the source of truth for identity and role — never localStorage.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!tokenStore.access) {
        setIsLoading(false)
        return
      }
      try {
        const { user: apiUser } = await api.get<MeResponse>("/auth/me")
        if (!cancelled) setUser(toUser(apiUser))
      } catch {
        tokenStore.clear()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (
      email: string,
      password: string,
      allowedRoles?: readonly UserRole[],
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = await api.publicPost<LoginResponse>("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        })

        // The portal gate runs BEFORE the tokens are stored, so a rejected
        // sign-in leaves no session behind to clean up — the server minted a
        // pair, we simply never keep them.
        //
        // This is a routing convenience, not a security boundary. Authority
        // still comes from the role inside the token, which the server put
        // there and checks on every request; a caller who skips this page
        // entirely gets exactly the access their role allows. What the gate
        // buys is a clear answer instead of a confusing one — landing an
        // employee in the admin portal would show them a dashboard stripped
        // of everything it advertises.
        if (allowedRoles && !allowedRoles.includes(data.user.role)) {
          const label = ROLE_LABELS[data.user.role]
          return {
            success: false,
            error: `Your account is registered as ${label}. Select the ${label} portal to sign in.`,
          }
        }

        tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        setUser(toUser(data.user))
        return { success: true }
      } catch (err) {
        // The server only distinguishes these two AFTER verifying the password,
        // so passing them through is not an enumeration oracle — and an invited
        // user told "invalid password" will retry forever instead of going to
        // look for their activation email.
        const PASS_THROUGH = ["NETWORK_ERROR", "AUTH_NOT_ACTIVATED", "AUTH_DEACTIVATED"]
        const message =
          err instanceof ApiError
            ? PASS_THROUGH.includes(err.code)
              ? err.message
              : // Never reveal which field was wrong — user-enumeration guard.
                "Invalid email or password"
            : "Something went wrong. Please try again."
        return { success: false, error: message }
      }
    },
    [],
  )

  const adoptSession = useCallback((data: LoginResponse) => {
    tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    setUser(toUser(data.user))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", { refreshToken: tokenStore.refresh })
    } catch {
      // Logging out locally matters more than the server call succeeding.
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, adoptSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
