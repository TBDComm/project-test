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

    const fetchUserData = (uid) => {
      getUserData(uid)
        .then(data => { if (mounted) setUserData(data) })
        .catch(() => {
          if (mounted) setUserData({ plan: 'free', monthlyUsage: 0, usageMonth: null, subscriptionEnd: null })
        })
    }

    // auth 상태(로그인 여부)를 확인하는 즉시 loading 해제 — getUserData를 기다리지 않음
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        const sessionUser = session?.user ?? null
        setUser(sessionUser)
        setLoading(false)                          // ← 여기서 바로 해제
        if (sessionUser) fetchUserData(sessionUser.id) // ← DB는 백그라운드에서
      })
      .catch(() => { if (mounted) setLoading(false) })

    // 로그인·로그아웃·토큰 갱신 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return // getSession이 처리
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (!sessionUser) {
        setUserData(null)
      } else {
        fetchUserData(sessionUser.id)
      }
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
