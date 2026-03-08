import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserData } from '../lib/user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const applySession = async (sessionUser) => {
      if (!sessionUser) {
        if (mounted) { setUser(null); setUserData(null) }
        return
      }
      if (mounted) setUser(sessionUser)
      try {
        const data = await getUserData(sessionUser.id)
        if (mounted) setUserData(data)
      } catch {
        if (mounted) setUserData({ plan: 'free', monthlyUsage: 0, usageMonth: null, subscriptionEnd: null })
      }
    }

    // getSession으로 초기 세션을 신뢰성 있게 처리 (무한 로딩 방지)
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        await applySession(session?.user ?? null)
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })

    // 이후 로그인·로그아웃·토큰 갱신 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return // getSession이 처리
      if (!mounted) return
      await applySession(session?.user ?? null)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, setUserData, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
