// 对齐线上 V0.0.5
import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCatchRecords } from '../../utils/api/catch'
import { requireLogin } from '../../utils/login'
import { useLoginModal } from '../../hooks/useLoginModal'
import { payForCatchBill } from '../../utils/payment'
import { showToast } from '../../utils/index'
import { API_BASE_URL } from '../../utils/config'
import type { CatchRecord } from '../../utils/types'
import './index.scss'

// 单价：后端未存单价，用「超出费用 ÷ 超出斤数」还原（回收单固定 5 元/斤）
function calcUnitPrice(raw: any): number {
  const ow = Number(raw?.over_weight) || 0
  const fee = Number(raw?.extra_fee) || 0
  if (ow > 0 && fee > 0) return Math.round((fee / ow) * 100) / 100
  if (Number(raw?.is_recycle)) return 5
  return 0
}

// 后端返回 snake_case，这里转成页面需要的 camelCase
// SELECT cr.* + 关联 catch_bills(cb): over_weight / is_recycle / bill_id / bill_no / bill_status
function normalizeRecord(raw: any): CatchRecord {
  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.user_id ?? ''),
    fishType: raw?.fish_type || '未知鱼种',
    weight: Number(raw?.weight) || 0,
    catchDate: raw?.catch_date || '',
    pointsEarned: Number(raw?.points_earned) || 0,
    // 后端 use_quota 是数字(实际抵扣福利鱼斤数)
    useQuota: Number(raw?.use_quota) > 0,
    useQuotaWeight: Number(raw?.use_quota) || 0,
    unitPrice: calcUnitPrice(raw),
    extraFee: Number(raw?.extra_fee) || 0,
    operatorId: String(raw?.operator_id ?? ''),
    remark: raw?.remark || '',
    // 照片后端存相对路径(/uploads/...)，拼完整域名才能显示
    photo: raw?.photo ? `${API_BASE_URL}${raw.photo}` : '',
    overWeight: Number(raw?.over_weight) || 0,
    isRecycle: !!raw?.is_recycle,
    billId: raw?.bill_id != null ? Number(raw.bill_id) : undefined,
    billNo: raw?.bill_no || '',
    billStatus: (raw?.bill_status as 'pending' | 'paid' | 'cancelled') || undefined,
  }
}

// 日期展示：后端 catch_date 为 date/ISO，统一成 "8月2日"
function formatDate(val: string): string {
  if (!val) return ''
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`
  return val
}

// 带超时的加载：避免真机请求挂起导致页面永远"正在加载中"
function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请重试')), ms)
    )
  ])
}

export default function CatchHistoryPage() {
  const login = useLoginModal()
  const [records, setRecords] = useState<CatchRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadRecords = useCallback(async () => {
    if (!requireLogin()) {
      return
    }
    setLoading(true)
    setLoadFailed(false)
    try {
      const data = await withTimeout(getCatchRecords({ page: 1, pageSize: 50 }))
      const list = (data && data.list ? data.list : []).map(normalizeRecord)
      setRecords(list)
    } catch (e: any) {
      console.error('[CatchHistoryPage] 加载失败:', e?.message || e)
      setRecords([])
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
    // 登录/退出后重新加载（登录成功即可见当前账号渔获）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRecords, login.authVersion])

  // 统计
  const totalCount = records.length
  const totalWeight = records.reduce((s, r) => s + r.weight, 0)
  const totalPoints = records.reduce((s, r) => s + r.pointsEarned, 0)

  // 未付账单（超重费用待支付）
  const unpaidBills = records.filter(r => r.billStatus === 'pending' && r.billId != null && (r.extraFee || 0) > 0)
  const unpaidTotal = unpaidBills.reduce((s, r) => s + (r.extraFee || 0), 0)
  const [payingId, setPayingId] = useState<number | null>(null)

  const handlePay = useCallback(async (record: CatchRecord) => {
    if (!record.billId || payingId != null) return
    if (!requireLogin()) return
    setPayingId(record.billId)
    const ok = await payForCatchBill(record.billId)
    setPayingId(null)
    if (ok) {
      showToast('支付成功', 'success')
      loadRecords()
    }
  }, [payingId, loadRecords])

  return (
    <View className='page catch-page'>
      {/* 统计 */}
      <View className='catch-summary'>
        <View className='summary-item'>
          <Text className='summary-num'>{totalCount}</Text>
          <Text className='summary-label'>记录次数</Text>
        </View>
        <View className='summary-item'>
          <Text className='summary-num'>{totalWeight.toFixed(1)}</Text>
          <Text className='summary-label'>总渔获（斤）</Text>
        </View>
        <View className='summary-item'>
          <Text className='summary-num'>{totalPoints}</Text>
          <Text className='summary-label'>获得积分</Text>
        </View>
      </View>

      {/* 未付账单横幅 */}
      {unpaidBills.length > 0 ? (
        <View
          className='unpaid-banner'
          onClick={() => handlePay(unpaidBills[0])}
        >
          <Text className='unpaid-text'>
            🔔 你有 {unpaidBills.length} 笔渔获超出费用待支付，合计 ¥{unpaidTotal.toFixed(2)}，去支付 →
          </Text>
        </View>
      ) : null}

      {/* 记录列表 */}
      <View className='catch-list'>
        {loading ? (
          <View className='empty'>
            <Text className='empty-text'>加载中...</Text>
          </View>
        ) : loadFailed ? (
          <View className='empty'>
            <Text className='empty-icon'>⚠️</Text>
            <Text className='empty-text'>加载失败，请检查网络</Text>
            <Text className='empty-retry' onClick={() => loadRecords()}>点击重试</Text>
          </View>
        ) : records.length === 0 ? (
          <View className='empty'>
            <Text className='empty-icon'>🐟</Text>
            <Text className='empty-text'>暂无渔获记录</Text>
          </View>
        ) : (
          records.map(record => (
            <View key={record.id} className='catch-card'>
              <View className='catch-info'>
                <View className='catch-header'>
                  <Text className='catch-fish'>🐟 {record.fishType}</Text>
                  {record.useQuota && (
                    <Text className='quota-tag'>福利鱼</Text>
                  )}
                  {record.isRecycle ? (
                    <Text className='recycle-tag'>回收</Text>
                  ) : null}
                </View>
                <View className='catch-data'>
                  <Text className='catch-item'>⚖️ {record.weight} 斤</Text>
                  <Text className='catch-item'>📅 {formatDate(record.catchDate)}</Text>
                </View>
                {/* 结算明细：福利鱼抵扣 / 超出斤数 × 单价 */}
                {(record.useQuotaWeight || 0) > 0 ||
                (record.overWeight || 0) > 0 ? (
                  <View className='catch-detail'>
                    {(record.useQuotaWeight || 0) > 0 ? (
                      <Text className='detail-line'>
                        🎁 福利鱼抵扣 {record.useQuotaWeight} 斤
                      </Text>
                    ) : null}
                    {(record.overWeight || 0) > 0 ? (
                      <Text className='detail-line'>
                        {record.isRecycle ? '♻️ 回收' : '💰 超出'}{' '}
                        {record.overWeight} 斤 × {record.unitPrice || 0} 元/斤
                      </Text>
                    ) : (
                      <Text className='detail-line'>✅ 全部由福利鱼抵扣</Text>
                    )}
                  </View>
                ) : null}
                {record.remark ? (
                  <View className='catch-remark'>
                    <Text className='catch-item'>📝 {record.remark}</Text>
                  </View>
                ) : null}
                {/* 超重费用账单状态 */}
                {record.billStatus === 'paid' ? (
                  <View className='bill-row paid'>
                    <Text className='bill-text'>已支付超出费 ¥{(record.extraFee || 0).toFixed(2)}</Text>
                  </View>
                ) : record.billStatus === 'pending' && record.billId != null ? (
                  <View
                    className='bill-row pending'
                    onClick={() => handlePay(record)}
                  >
                    <Text className='bill-text'>
                      待支付超出费 ¥{(record.extraFee || 0).toFixed(2)}
                    </Text>
                    <Text className='bill-btn'>
                      {payingId === record.billId ? '支付中...' : '去支付 →'}
                    </Text>
                  </View>
                ) : null}
                {/* 渔获照片（点开看大图） */}
                {record.photo ? (
                  <View className='catch-photo-wrap'>
                    <Image
                      className='catch-photo'
                      src={record.photo}
                      mode='aspectFill'
                      onClick={() =>
                        Taro.previewImage({
                          current: record.photo,
                          urls: records
                            .map(r => r.photo)
                            .filter((u): u is string => !!u)
                        })
                      }
                    />
                  </View>
                ) : null}
              </View>
              <View className='catch-points'>
                <Text className='points-plus'>+{record.pointsEarned}</Text>
                <Text className='points-label'>积分</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {login.renderLogin}
    </View>
  )
}
