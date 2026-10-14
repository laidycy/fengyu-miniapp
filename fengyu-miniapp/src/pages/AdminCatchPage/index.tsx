// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getAdminCatchRecords, createAdminCatchRecord, isAdminLoggedIn
} from '../../utils/api/admin'
import type { AdminCatchRecord } from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import './index.scss'

const FISH_TYPES = ['草鱼', '鲢鳙', '鲤鱼', '鲫鱼', '青鱼', '鳊鱼', '翘嘴', '其他']

export default function AdminCatchPage() {
  const [auth, setAuth] = useState(false)

  // 表单
  const [memberNo, setMemberNo] = useState('')
  const [fishType, setFishType] = useState(FISH_TYPES[0])
  const [fishIndex, setFishIndex] = useState(0)
  const [weight, setWeight] = useState('')
  const [catchDate, setCatchDate] = useState('')
  const [useQuota, setUseQuota] = useState(false)
  const [remark, setRemark] = useState('')

  // 列表
  const [records, setRecords] = useState<AdminCatchRecord[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [filterFishType, setFilterFishType] = useState('')

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      showToast('请先登录管理员账号')
      Taro.reLaunch({ url: '/pages/AdminDashPage/index' })
      return
    }
    setAuth(true)
    setCatchDate(todayStr())
    loadRecords()
  }, [])

  const todayStr = () => {
    const d = new Date()
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const loadRecords = async () => {
    try {
      const data = await getAdminCatchRecords({
        date: filterDate || undefined,
        fishType: filterFishType || undefined
      })
      setRecords(data && Array.isArray(data) ? data : [])
    } catch {
      setRecords([])
    }
  }

  const handleSubmit = async () => {
    if (!memberNo) {
      showToast('请输入会员号或用户ID')
      return
    }
    if (!weight || Number(weight) <= 0) {
      showToast('请输入有效重量')
      return
    }
    try {
      await createAdminCatchRecord({
        user_id: memberNo.indexOf('_') > -1 || /^\d+$/.test(memberNo) ? memberNo : undefined,
        member_no: memberNo,
        fish_type: fishType,
        weight: Number(weight),
        catch_date: catchDate || todayStr(),
        use_quota: useQuota,
        remark: remark || undefined
      })
      showToast('录入成功', 'success')
      setMemberNo('')
      setWeight('')
      setRemark('')
      setUseQuota(false)
      loadRecords()
    } catch (e: any) {
      showToast(e.message || '录入失败')
    }
  }

  if (!auth) return <View className='page admin-catch-page' />

  return (
    <View className='page admin-catch-page'>
      {/* 录入表单 */}
      <View className='card'>
        <Text className='card-title'>🐟 录入渔获</Text>
        <View className='form-row'>
          <Text className='form-label'>会员号/用户</Text>
          <Input
            className='form-input'
            value={memberNo}
            placeholder='输入会员号或用户ID'
            onInput={(e) => setMemberNo(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='form-label'>鱼种</Text>
          <Picker
            mode='selector'
            range={FISH_TYPES}
            value={fishIndex}
            onChange={(e) => { setFishIndex(Number(e.detail.value)); setFishType(FISH_TYPES[Number(e.detail.value)]) }}
          >
            <View className='picker-value'>{fishType}</View>
          </Picker>
        </View>
        <View className='form-row'>
          <Text className='form-label'>重量(斤)</Text>
          <Input
            className='form-input'
            value={weight}
            type='digit'
            placeholder='如 5.5'
            onInput={(e) => setWeight(e.detail.value)}
          />
        </View>
        <View className='form-row'>
          <Text className='form-label'>日期</Text>
          <Input
            className='form-input'
            value={catchDate}
            placeholder='YYYY-MM-DD'
            onInput={(e) => setCatchDate(e.detail.value)}
          />
        </View>
        <View className='form-row quota-row'>
          <Text className='form-label'>福利鱼额度</Text>
          <View
            className={`quota-toggle ${useQuota ? 'on' : ''}`}
            onClick={() => setUseQuota(!useQuota)}
          >
            <Text className='quota-text'>{useQuota ? '使用额度' : '不使用'}</Text>
          </View>
        </View>
        <View className='form-row'>
          <Text className='form-label'>备注</Text>
          <Input
            className='form-input'
            value={remark}
            placeholder='选填'
            onInput={(e) => setRemark(e.detail.value)}
          />
        </View>
        <Button className='submit-btn' onClick={handleSubmit}>提交录入</Button>
      </View>

      {/* 查询区 */}
      <View className='card'>
        <Text className='card-title'>📋 渔获记录</Text>
        <View className='filter-row'>
          <Input
            className='filter-input'
            value={filterDate}
            placeholder='按日期筛选 YYYY-MM-DD'
            onInput={(e) => setFilterDate(e.detail.value)}
          />
          <Picker
            mode='selector'
            range={FISH_TYPES}
            onChange={(e) => setFilterFishType(FISH_TYPES[Number(e.detail.value)])}
          >
            <View className='filter-picker'>{filterFishType || '全部鱼种'}</View>
          </Picker>
          <Button className='filter-btn' onClick={loadRecords}>查询</Button>
        </View>

        {records.length === 0 ? (
          <View className='empty'>暂无渔获记录</View>
        ) : (
          <View className='table'>
            <View className='table-head'>
              <Text className='col member'>会员</Text>
              <Text className='col fish'>鱼种</Text>
              <Text className='col weight'>重量</Text>
              <Text className='col datec'>日期</Text>
              <Text className='col quota'>额度</Text>
            </View>
            {records.map((r, i) => (
              <View className='table-row' key={i}>
                <Text className='col member'>{r.member_no || r.user_name || r.nick_name || r.user_id || '-'}</Text>
                <Text className='col fish'>{r.fish_type}</Text>
                <Text className='col weight'>{r.weight}斤</Text>
                <Text className='col datec'>{r.catch_date || r.created_at || '-'}</Text>
                <Text className={`col quota ${r.use_quota ? 'on' : ''}`}>{r.use_quota ? '✓' : '-'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
