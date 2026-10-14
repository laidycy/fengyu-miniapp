// 兑换中心 —— 建设中占位页（积分仅可抵扣农副产品、满1年生效；消费渠道尚未开放）
// 注：原 mock 商品（鱼饵/垂钓券等垂钓渔具权益）与"积分仅抵农副产品"制度冲突，已移除，避免误导
import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { isLoggedIn, showToast, getCachedUserInfo } from '../../utils/index'
import { useLoginModal } from '../../hooks/useLoginModal'
import type { RedeemRecord } from '../../utils/types'
import './index.scss'

export default function RedeemPage() {
  const login = useLoginModal()
  const [userInfo, setUserInfo] = useState(getCachedUserInfo())
  const records: RedeemRecord[] = []

  // 当前可用积分（member.points）
  const points = (userInfo?.member as any)?.points ?? 0

  useEffect(() => {
    if (isLoggedIn()) {
      setUserInfo(getCachedUserInfo())
    }
  }, [])

  const handleNotify = () => {
    showToast('兑换功能建设中，敬请期待')
  }

  return (
    <View className='redeem-page'>
      {/* 积分余额：可用 / 锁定 */}
      <View className='points-header'>
        <Text className='points-label'>我的积分</Text>
        <Text className='points-num'>{points}</Text>
        <Text className='points-tip'>积分仅可抵扣农副产品 · 满1年生效</Text>
      </View>

      {/* 建设中占位 */}
      <View className='section'>
        <Text className='section-title'>农副产品兑换（建设中）</Text>
        <View className='empty'>
          <View className='empty-icon'>🚧</View>
          <Text className='empty-text'>积分兑换农副产品功能即将上线</Text>
          <Text className='empty-sub'>
            积分仅可用于抵扣农副产品（1分=1元），不用于钓鱼{'\n'}
            获得的积分满1年后方可使用（锁定积分）{'\n'}
            兑换渠道开通后，可在线抵扣蔬果、鱼丸鱼冻等
          </Text>
          <Button className='notify-btn' onClick={handleNotify}>有货提醒</Button>
        </View>
      </View>

      {/* 兑换记录 */}
      <View className='section'>
        <Text className='section-title'>兑换记录</Text>
        {!records || records.length === 0 ? (
          <View className='empty'>
            <Text className='empty-text'>暂无兑换记录</Text>
          </View>
        ) : (
          records.map(record => (
            <View key={record.id} className='record-item'>
              <View className='record-info'>
                <Text className='record-name'>{record.itemName}</Text>
                <Text className='record-date'>{record.date}</Text>
              </View>
              <View className='record-right'>
                <Text className='record-points'>-{record.points} 积分</Text>
                <Text className={`record-status ${record.status}`}>
                  {record.status === 'completed' ? '已完成' : '处理中'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {login.renderLogin}
    </View>
  )
}
