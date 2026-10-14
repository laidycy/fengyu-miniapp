// 触点积分页 —— 支持积分锁定期（1年后生效）展示；对齐后端 points-log（snake_case 返回）
import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import { getPointsLog, getMemberInfo } from '../../utils/api/members'
import { getCachedUserInfo } from '../../utils/index'
import { requireLogin } from '../../utils/login'
import { useLoginModal } from '../../hooks/useLoginModal'
import type { PointsLog } from '../../utils/types'
import './index.scss'

// 积分来源显示名
const SOURCE_NAMES: Record<string, string> = {
  catch: '渔获积分',
  register: '注册奖励',
  redeem: '积分兑换',
  recharge: '充值奖励',
  member: '会员积分',
  legacy: '存量积分'
}

// 兼容 snake_case（后端 SELECT * 直出）与 camelCase
function pick<T = any>(obj: any, ...keys: string[]): T {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T
  }
  return undefined as any
}

// 格式化日期（兼容 created_at / createdAt）
function fmtDate(v: any): string {
  if (!v) return ''
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}

export default function PointsPage() {
  const login = useLoginModal()
  const [points, setPoints] = useState(0)          // 可用积分
  const [locked, setLocked] = useState(0)          // 锁定积分（未生效）
  const [totalPoints, setTotalPoints] = useState(0) // 累计积分
  const [logs, setLogs] = useState<PointsLog[]>([])
  const [loading, setLoading] = useState(false)

  // 从缓存读取当前会员积分
  const initFromCache = useCallback(() => {
    const user = getCachedUserInfo()
    if (user && user.member) {
      const m: any = user.member
      setPoints(Number(pick(m, 'points', 'points') ?? 0))
      setLocked(Number(pick(m, 'locked_points', 'lockedPoints') ?? 0))
      setTotalPoints(Number(pick(m, 'total_points', 'totalPoints') ?? 0) || Number(pick(m, 'points') ?? 0))
    }
  }, [])

  const loadLogs = useCallback(async () => {
    if (!requireLogin()) {
      return
    }
    setLoading(true)
    try {
      // 刷新会员积分（含锁定）
      try {
        const member: any = await getMemberInfo()
        setPoints(Number(pick(member, 'points') ?? 0))
        setLocked(Number(pick(member, 'locked_points', 'lockedPoints') ?? 0))
        setTotalPoints(Number(pick(member, 'total_points', 'totalPoints') ?? 0) || Number(pick(member, 'points') ?? 0))
      } catch {
        initFromCache()
      }

      const data = await getPointsLog({ page: 1, pageSize: 50 })
      const list: any[] = (data && data.list) ? data.list : []
      setLogs(list as PointsLog[])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [initFromCache])

  useEffect(() => {
    initFromCache()
    loadLogs()
    // 登录/退出后重新加载（登录成功即可见积分明细）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initFromCache, loadLogs, login.authVersion])

  return (
    <View className='page points-page'>
      {/* 头部：可用积分 / 锁定积分 / 累计积分 */}
      <View className='points-header'>
        <View className='points-block'>
          <Text className='points-label'>可用积分</Text>
          <Text className='points-num'>{points}</Text>
        </View>
        <View className='points-block'>
          <Text className='points-label'>锁定积分</Text>
          <Text className='points-sub'>{locked}</Text>
          <Text className='points-locked-tip'>满1年生效</Text>
        </View>
        <View className='points-block'>
          <Text className='points-label'>累计积分</Text>
          <Text className='points-sub'>{totalPoints}</Text>
        </View>
      </View>

      {/* 积分明细 */}
      <View className='section'>
        <Text className='section-title'>积分明细</Text>
        {loading ? (
          <View className='empty'>
            <Text className='empty-text'>加载中...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View className='empty'>
            <Text className='empty-text'>暂无积分变动记录</Text>
          </View>
        ) : (
          logs.map(log => {
            const isEarn = log.type === 'earn'
            const av = pick<string | null>(log, 'available_at', 'availableAt')
            const date = fmtDate(pick(log, 'created_at', 'createdAt'))
            return (
              <View key={log.id} className='log-item'>
                <View className='log-info'>
                  <Text className='log-title'>
                    {SOURCE_NAMES[log.source] || '积分变动'}
                  </Text>
                  {av ? (
                    <Text className='log-date'>预计生效 {fmtDate(av)} · {date}</Text>
                  ) : (
                    <Text className='log-date'>{date}</Text>
                  )}
                </View>
                <Text className={`log-points ${isEarn ? 'earn' : 'consume'}`}>
                  {isEarn ? `+${log.amount}` : `-${Math.abs(log.amount)}`}
                </Text>
              </View>
            )
          })
        )}
      </View>

      {/* 积分规则 */}
      <View className='section'>
        <Text className='section-title'>积分规则</Text>
        <View className='rule-item'>
          <Text className='rule-dot'>•</Text>
          <Text className='rule-text'>记录渔获可获得积分，重量越高积分越多</Text>
        </View>
        <View className='rule-item'>
          <Text className='rule-dot'>•</Text>
          <Text className='rule-text'>开通会员可获赠积分，等级越高赠送越多</Text>
        </View>
        <View className='rule-item'>
          <Text className='rule-dot'>•</Text>
          <Text className='rule-text'>积分仅可抵扣农副产品（1分=1元），不用于钓鱼</Text>
        </View>
        <View className='rule-item'>
          <Text className='rule-dot'>•</Text>
          <Text className='rule-text'>获得的积分满1年后方可使用（锁定积分）</Text>
        </View>
      </View>

      {login.renderLogin}
    </View>
  )
}
