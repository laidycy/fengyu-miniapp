// 对齐线上 V0.0.5
import { useState, useEffect, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getOrders } from '../../utils/api/orders'
import { TIME_SLOT_NAMES, TIME_SLOT_RANGES, ORDER_STATUS_NAMES } from '../../utils/config'
import { requireLogin } from '../../utils/login'
import { useLoginModal } from '../../hooks/useLoginModal'
import type { Order, OrderStatus } from '../../utils/types'
import './index.scss'

// 顶部 tab
const STATUS_TABS: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'confirmed', label: '已确认' },
  { key: 'used', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
]

// 日期展示：把后端 ISO 时间戳格式化成"8月31日"，兼容 "2026-08-31" 或 "2026-08-31T16:00:00.000Z"
function formatShortDate(val: string): string {
  if (!val) return ''
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`
  return val
}

export default function OrderListPage() {
  const login = useLoginModal()
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  // 加载订单列表
  const loadOrders = useCallback(async () => {
    if (!requireLogin()) {
      return
    }
    setLoading(true)
    try {
      const data = await getOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        page: 1,
        pageSize: 50
      })
      setOrders(data && data.list ? data.list : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadOrders()
    // 登录/退出后重新加载（登录成功即可见订单）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrders, login.authVersion])

  // 切换 tab
  const handleTab = (key: OrderStatus | 'all') => {
    setActiveTab(key)
  }

  // 点击订单卡片 → 详情
  const goDetail = (order: Order) => {
    Taro.navigateTo({
      url: `/pages/OrderDetailPage/index?id=${order.id}`
    })
  }

  // 去支付 / 查看核销码
  const handleAction = (order: Order) => {
    if (order.status === 'pending') {
      Taro.navigateTo({
        url: `/pages/OrderDetailPage/index?id=${order.id}&action=pay`
      })
    } else if (order.status === 'confirmed' || order.status === 'used') {
      Taro.navigateTo({
        url: `/pages/OrderDetailPage/index?id=${order.id}&action=qr`
      })
    }
  }

  return (
    <View className='page order-list-page'>
      {/* 状态筛选 */}
      <View className='tabs'>
        {STATUS_TABS.map(tab => (
          <View
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTab(tab.key)}
          >
            <Text className='tab-label'>{tab.label}</Text>
          </View>
        ))}
      </View>

      {/* 订单列表 */}
      <View className='order-list'>
        {loading ? (
          <View className='empty'>
            <Text className='empty-text'>加载中...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>🎣</Text>
            <Text className='empty-text'>暂无预约记录</Text>
          </View>
        ) : (
          orders.map(order => (
            <View
              key={order.id}
              className='order-card'
              onClick={() => goDetail(order)}
            >
              <View className='order-header'>
                <Text className='order-no'>订单号 {order.orderNo}</Text>
                <Text className={`order-status ${order.status}`}>
                  {ORDER_STATUS_NAMES[order.status] || order.status}
                </Text>
              </View>

              <View className='order-body'>
                <Text className='order-line'>
                  预约日期：{formatShortDate(order.date)}
                </Text>
                <Text className='order-line'>
                  时段：{TIME_SLOT_NAMES[order.timeSlot] || order.timeSlot}
                  {TIME_SLOT_RANGES[order.timeSlot] ? ` ${TIME_SLOT_RANGES[order.timeSlot]}` : ''}
                </Text>
                <Text className='order-line'>
                  人数：{order.peopleCount} 人
                </Text>
              </View>

              <View className='order-footer'>
                <Text className='order-price'>
                  <Text className='price-symbol'>¥</Text>
                  {order.deposit.toFixed(2)}
                </Text>
                {order.status === 'pending' && (
                  <Button
                    className='pay-btn'
                    onClick={() => handleAction(order)}
                  >
                    去支付
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button
                    className='qr-btn'
                    onClick={() => handleAction(order)}
                  >
                    查看核销码
                  </Button>
                )}
                {order.status === 'used' && (
                  <Text className='used-tip'>已核销</Text>
                )}
                {order.status === 'cancelled' && (
                  <Text className='cancelled-tip'>已取消</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {login.renderLogin}
    </View>
  )
}
