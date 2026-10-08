'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  id: number | string
  username?: string
  email?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refetch: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/users/me')
      if (res.ok) {
        const data = (await res.json()) as { user?: User }
        setUser(data.user || null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
