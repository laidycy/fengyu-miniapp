// 对齐线上 V0.0.5
import { useState, useEffect } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getOrderDetail, cancelOrder } from '../../utils/api/orders'
import { getOrderQrCode } from '../../utils/api/qrcode'
import { TIME_SLOT_NAMES, TIME_SLOT_RANGES, ORDER_STATUS_NAMES } from '../../utils/config'
import { showToast, hideLoading } from '../../utils/index'
import { payForOrder } from '../../utils/payment'
import { gearDisplayFromOrder, gearTextFromRemark } from '../../utils/gear'
import type { Order } from '../../utils/types'
import './index.scss'

// 状态头部 icon
const STATUS_ICON: Record<string, string> = {
  pending: '💰',
  confirmed: '✅',
  used: '🎣',
  cancelled: '📄',
  refunded: '📄'
}

// 日期展示：把后端 ISO 时间戳格式化成"2026年8月31日"，兼容 "2026-08-31" 或 "2026-08-31T16:00:00.000Z"
function formatShortDate(val: string): string {
  if (!val) return ''
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`
  return val
}

export default function OrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [qrcode, setQrcode] = useState('')
  const [bookingCode, setBookingCode] = useState('')

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    const id = params?.id
    const action = params?.action
    if (!id) return
    loadOrder(id).then((data) => {
      if (!data) return
      // confirmed/used 订单应展示核销码：无论从列表进入(无action)还是查看核销码(action=qr)都自动加载
      if (data.status === 'confirmed' || data.status === 'used') {
        loadQr(id)
      }
      if (action === 'pay') {
        setTimeout(() => handlePay(id), 600)
      }
    })
  }, [])

  const loadOrder = async (id: string) => {
    try {
      const data = await getOrderDetail(id)
      setOrder(data)
      return data
    } catch {
      showToast('订单不存在或已删除', 'none')
      return null
    }
  }

  // 加载核销码 + 二维码
  const loadQr = async (id: string) => {
    try {
      const res = await getOrderQrCode(id)
      setQrcode(res.qrcode || '')
      setBookingCode(res.bookingCode || '')
      // 用函数式更新，避免闭包读到旧的 order（原实现 `if (order && ...)` 始终为 null，bookingCode 回填失效）
      setOrder(prev => (prev && prev.status === 'confirmed' ? { ...prev, bookingCode: res.bookingCode } : prev))
    } catch {
      showToast('核销码加载失败', 'none')
    }
  }

  // 支付
  const handlePay = async (id?: string) => {
    const orderId = id || order?.id
    if (!orderId) return
    setLoading(true)
    const ok = await payForOrder(orderId)
    hideLoading()
    setLoading(false)
    if (ok) {
      showToast('支付成功', 'success')
      loadOrder(orderId)
    }
  }

  // 取消订单
  const handleCancel = () => {
    if (!order) return
    Taro.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cancelOrder(order.id)
            showToast('订单已取消', 'success')
            loadOrder(order.id)
          } catch {
            showToast('取消失败', 'none')
          }
        }
      }
    })
  }

  if (!order) {
    return (
      <View className='page order-detail-page'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  const statusText = ORDER_STATUS_NAMES[order.status] || order.status
  const statusIcon = STATUS_ICON[order.status] || '📄'
  const pending = order.status === 'pending'
  const confirmed = order.status === 'confirmed'
  const used = order.status === 'used'
  // 预订支付口径（方案A）：在线只收定金，尾款到店结算
  const depositRatePct =
    order.totalAmount > 0 ? Math.round((order.deposit / order.totalAmount) * 100) : 30
  const tailAmount = Math.max(order.totalAmount - order.deposit, 0)

  return (
    <View className='page order-detail-page'>
      {/* 状态横幅 */}
      <View className={`status-banner ${order.status}`}>
        <Text className='status-icon'>{statusIcon}</Text>
        <Text className='status-text'>{statusText}</Text>
      </View>

      {/* 订单信息 */}
      <View className='section'>
        <Text className='section-title'>预约信息</Text>
        <View className='info-row'>
          <Text className='info-label'>垂钓日期</Text>
          <Text className='info-value'>{formatShortDate(order.date)}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>时段</Text>
          <Text className='info-value'>
            {TIME_SLOT_NAMES[order.timeSlot] || order.timeSlot}
            {TIME_SLOT_RANGES[order.timeSlot] ? ` ${TIME_SLOT_RANGES[order.timeSlot]}` : ''}
          </Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>人数</Text>
          <Text className='info-value'>{order.peopleCount} 人</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>渔具租赁</Text>
          <Text className='info-value'>{gearDisplayFromOrder(order)}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>订单号</Text>
          <Text className='info-value'>{order.orderNo}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>创建时间</Text>
          <Text className='info-value'>{order.createdAt}</Text>
        </View>
        {order.remark && !gearTextFromRemark(order.remark) && (
          <View className='info-row'>
            <Text className='info-label'>备注</Text>
            <Text className='info-value'>{order.remark}</Text>
          </View>
        )}
      </View>

      {/* 金额区 */}
      <View className='section amount-section'>
        <Text className='section-title'>费用明细</Text>
        <View className='amount-row'>
          <Text className='amount-label'>订单总额（{order.peopleCount} 人）</Text>
          <Text className='amount-value'>¥{order.totalAmount.toFixed(2)}</Text>
        </View>
        <View className='amount-row total'>
          <Text className='amount-label'>
            {depositRatePct >= 100 ? '在线支付（全额）' : `在线支付定金（${depositRatePct}%）`}
          </Text>
          <Text className='amount-total'>
            <Text className='amount-symbol'>¥</Text>
            {order.deposit.toFixed(2)}
          </Text>
        </View>
        {tailAmount > 0 && (
          <View className='amount-row'>
            <Text className='amount-label'>到店结算尾款</Text>
            <Text className='amount-value'>¥{tailAmount.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* 核销码 */}
      {(confirmed || used) && (
        <View className='section qr-section'>
          <Text className='section-title'>核销码</Text>
          <View className='qr-box'>
            {qrcode ? (
              <Image className='qr-img' src={qrcode} mode='widthFix' />
            ) : (
              <Text className='qr-placeholder'>点击加载核销码</Text>
            )}
          </View>
          <Text className='qr-code-text'>
            核销码：{bookingCode || order.bookingCode}
          </Text>
          <Text className='qr-tip'>向现场工作人员出示此码核销</Text>
        </View>
      )}

      {/* 操作栏 */}
      {(pending || confirmed) && (
        <View className='action-bar'>
          <Button className='btn-cancel' onClick={handleCancel}>
            取消订单
          </Button>
          {pending && (
            <Button
              className='btn-pay'
              loading={loading}
              onClick={() => handlePay()}
            >
              去支付
            </Button>
          )}
        </View>
      )}
    </View>
  )
}
