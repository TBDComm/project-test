import { supabase } from './supabase'
import { getCurrentMonth } from './date'

// Supabase DB에서 사용자 데이터 가져오기 (없으면 생성)
export async function getUserData(uid) {
  const currentMonth = getCurrentMonth()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single()

  if (error || !data) {
    const newUser = {
      id: uid,
      plan: 'free',
      monthly_usage: 0,
      usage_month: currentMonth,
      subscription_end: null,
    }
    await supabase.from('users').insert(newUser)
    return { plan: 'free', monthlyUsage: 0, usageMonth: currentMonth, subscriptionEnd: null }
  }

  // 월이 바뀌면 사용량 초기화
  if (data.usage_month !== currentMonth) {
    await supabase
      .from('users')
      .update({ monthly_usage: 0, usage_month: currentMonth })
      .eq('id', uid)
    data.monthly_usage = 0
    data.usage_month = currentMonth
  }

  return {
    plan: data.plan,
    monthlyUsage: data.monthly_usage,
    usageMonth: data.usage_month,
    subscriptionEnd: data.subscription_end,
    isAdmin: data.is_admin || false,
  }
}

// Spotlight Compare 사용 1회 차감
export async function incrementUsage(uid) {
  // maybeSingle(): 행이 없으면 에러 대신 null을 반환 — .single()은 0행일 때 에러를 던짐
  const { data, error: selectError } = await supabase
    .from('users')
    .select('monthly_usage')
    .eq('id', uid)
    .maybeSingle()

  if (selectError) throw new Error('사용량 업데이트 실패: ' + selectError.message)

  const { error: updateError } = await supabase
    .from('users')
    .update({ monthly_usage: (data?.monthly_usage ?? 0) + 1 })
    .eq('id', uid)

  if (updateError) throw new Error('사용량 업데이트 실패: ' + updateError.message)
}
