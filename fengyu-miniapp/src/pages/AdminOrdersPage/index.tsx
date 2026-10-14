// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getAdminOrders, updateAdminOrderStatus, isAdminLoggedIn } from '../../utils/api/admin'
import type { AdminOrder } from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import { ORDER_STATUS_NAMES, TIME_SLOT_NAMES } from '../../utils/config'
import './index.scss'

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'confirmed', label: '已确认' },
  { key: 'used', label: '已核销' },
  { key: 'cancelled', label: '已取消' },
  { key: 'refunded', label: '已退款' }
]

export default function AdminOrdersPage() {
  const [auth, setAuth] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      showToast('请先登录管理员账号')
      Taro.reLaunch({ url: '/pages/AdminDashPage/index' })
      return
    }
    setAuth(true)
    loadOrders()
  }, [])

  const loadOrders = async (statusParam?: string, dateParam?: string) => {
    try {
      const data = await getAdminOrders({ status: statusParam || undefined, date: dateParam || undefined })
      setOrders(data && Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    }
  }

  const filter = () => {
    loadOrders(status, date)
  }

  const handleStatus = (order: AdminOrder, next: string) => {
    const actionText = {
      confirmed: '确认收款/确认预约',
      used: '确认核销',
      cancelled: '取消订单',
      refunded: '退款'
    }[next] || '更新状态'
    Taro.showModal({
      title: `${actionText}？`,
      content: `将订单 ${order.order_no} 标记为「${ORDER_STATUS_NAMES[next] || next}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await updateAdminOrderStatus(order.id, next as any)
            showToast('操作成功', 'success')
            setOrders(orders.map(o => (o.id === order.id ? { ...o, status: next } : o)))
          } catch (e: any) {
            showToast(e.message || '操作失败')
          }
        }
      }
    })
  }

  const slotName = (s: string) => TIME_SLOT_NAMES[s] || s
  const statusInfo = (s: string) => ({
    pending: { text: '待支付', cls: 'pending' },
    confirmed: { text: '已确认', cls: 'confirmed' },
    used: { text: '已核销', cls: 'used' },
    cancelled: { text: '已取消', cls: 'cancelled' },
    refunded: { text: '已退款', cls: 'refunded' }
  }[s] || { text: s, cls: '' })

  if (!auth) return <View className='page admin-orders-page' />

  return (
    <View className='page admin-orders-page'>
      {/* 筛选 */}
      <View className='card'>
        <View className='filter-row'>
          <Input
            className='filter-input'
            value={date}
            placeholder='按日期 YYYY-MM-DD'
            onInput={(e) => setDate(e.detail.value)}
          />
          <Button className='filter-btn' onClick={filter}>查询</Button>
        </View>
        <View className='tabs'>
          {STATUS_FILTERS.map((t) => (
            <View
              key={t.key || 'all'}
              className={`tab-item ${status === t.key ? 'active' : ''}`}
              onClick={() => { setStatus(t.key); loadOrders(t.key, date) }}
            >
              <Text className='tab-label'>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 列表 */}
      {orders.length === 0 ? (
        <View className='empty'>暂无订单</View>
      ) : (
        <View className='order-list'>
          {orders.map((o) => {
            const st = statusInfo(o.status || '')
            return (
              <View key={o.id} className='order-card'>
                <View className='order-header'>
                  <Text className='order-no'>{o.order_no || `#${o.id}`}</Text>
                  <Text className={`order-status ${st.cls}`}>{st.text}</Text>
                </View>
                <View className='order-body'>
                  <View className='order-info'><Text className='info-label'>日期</Text><Text className='info-value'>{o.date}</Text></View>
                  <View className='order-info'><Text className='info-label'>时段</Text><Text className='info-value'>{slotName(o.time_slot)}</Text></View>
                  <View className='order-info'><Text className='info-label'>人数</Text><Text className='info-value'>{o.people_count} 人</Text></View>
                  <View className='order-info'><Text className='info-label'>金额</Text><Text className='info-value price'>¥{Number(o.total_amount).toFixed(2)}</Text></View>
                  <View className='order-info'><Text className='info-label'>定金</Text><Text className='info-value'>¥{Number(o.deposit).toFixed(2)}</Text></View>
                  <View className='order-info'><Text className='info-label'>用户</Text><Text className='info-value'>{o.user_name || o.nick_name || o.user_id || '-'}</Text></View>
                  <View className='order-info'><Text className='info-label'>会员号</Text><Text className='info-value'>{o.member_no || '-'}</Text></View>
                </View>
                <View className='order-actions'>
                  {o.status === 'pending' && (
                    <>
                      <Button className='op-btn cancel' onClick={() => handleStatus(o, 'cancelled')}>取消</Button>
                      <Button className='op-btn confirm' onClick={() => handleStatus(o, 'confirmed')}>确认收款</Button>
                    </>
                  )}
                  {o.status === 'confirmed' && (
                    <>
                      <Button className='op-btn cancel' onClick={() => handleStatus(o, 'cancelled')}>取消</Button>
                      <Button className='op-btn used' onClick={() => handleStatus(o, 'used')}>确认核销</Button>
                    </>
                  )}
                  {o.status === 'used' && (
                    <Button className='op-btn refund' onClick={() => handleStatus(o, 'refunded')}>退款</Button>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
