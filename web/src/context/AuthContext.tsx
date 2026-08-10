import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { api, ApiError, tokenStore } from "@/lib/api"
import { toUser, type LoginResponse, type MeResponse, type User, type UserRole } from "@/lib/types"

export type { UserRole, User }

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  /** True while we restore the session on first load — guards render a spinner until false. */
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  /**
   * Complete an invitation: set the password and start a session.
   * The server returns the same { user, accessToken, refreshToken } as login,
   * so the invitee lands signed in rather than being bounced to /login.
   */
  activate: (token: string, password: string) => Promise<{ success: boolean; error?: string }>
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
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = await api.publicPost<LoginResponse>("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        })
        tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        setUser(toUser(data.user))
        return { success: true }
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.code === "NETWORK_ERROR"
              ? err.message
              : // Never reveal which field was wrong — user-enumeration guard.
                "Invalid email or password"
            : "Something went wrong. Please try again."
        return { success: false, error: message }
      }
    },
    [],
  )

  const activate = useCallback(
    async (token: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = await api.publicPost<LoginResponse>("/auth/activate", { token, password })
        tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
        setUser(toUser(data.user))
        return { success: true }
      } catch (err) {
        // Unlike login, be specific here — the user is mid-setup and needs to
        // know whether the link died or the password was rejected.
        return {
          success: false,
          error: err instanceof ApiError ? err.message : "Could not activate this account.",
        }
      }
    },
    [],
  )

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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, activate, logout }}>
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
