import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserData } from '../lib/utils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange가 INITIAL_SESSION 이벤트로 초기 세션도 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        try {
          const data = await getUserData(session.user.id)
          setUserData(data)
        } catch (e) {
          console.error('getUserData 실패:', e)
          // 에러 시 기본값 사용 (무한 로딩 방지)
          setUserData({ plan: 'free', monthlyUsage: 0, usageMonth: null, subscriptionEnd: null })
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
