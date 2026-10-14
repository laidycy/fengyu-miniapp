// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Button, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getAdminMembers, updateAdminMemberLevel, isAdminLoggedIn } from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import { MEMBER_LEVEL_NAMES } from '../../utils/config'
import './index.scss'

const LEVELS = ['guest', 'silver', 'gold', 'diamond']
const LEVEL_LABELS = LEVELS.map((l) => MEMBER_LEVEL_NAMES[l])
const PHONE_BOUND_OPTS = [
  { key: '', label: '手机号' },
  { key: 'bound', label: '已绑定' },
  { key: 'unbound', label: '未绑定' }
]

export default function AdminMembersPage() {
  const [auth, setAuth] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState('')
  const [phoneBound, setPhoneBound] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      showToast('请先登录管理员账号')
      Taro.reLaunch({ url: '/pages/AdminDashPage/index' })
      return
    }
    setAuth(true)
    loadMembers()
  }, [])

  const loadMembers = async (params?: any) => {
    try {
      const data = await getAdminMembers({
        keyword: keyword || undefined,
        level: level || undefined,
        phoneBound: phoneBound || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        ...params
      })
      setMembers(data && Array.isArray(data) ? data : [])
    } catch {
      setMembers([])
    }
  }

  const filter = () => loadMembers()

  const doChangeLevel = (m: any, newLevel: string) => {
    if (newLevel === m.level) return
    Taro.showModal({
      title: '确认修改',
      content: `将「${m.nick_name || m.user_name || m.member_no}」等级改为「${MEMBER_LEVEL_NAMES[newLevel] || newLevel}」？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await updateAdminMemberLevel(m.id, newLevel)
            showToast('修改成功', 'success')
            setMembers(members.map(x => (x.id === m.id ? { ...x, level: newLevel } : x)))
          } catch (e: any) {
            showToast(e.message || '修改失败')
          }
        }
      }
    })
  }

  if (!auth) return <View className='page admin-members-page' />

  return (
    <View className='page admin-members-page'>
      {/* 筛选 */}
      <View className='card'>
        <View className='filter-row'>
          <Input
            className='filter-input'
            value={keyword}
            placeholder='关键词/会员号/昵称'
            onInput={(e) => setKeyword(e.detail.value)}
          />
          <Picker
            mode='selector'
            range={LEVEL_LABELS}
            onChange={(e) => setLevel(LEVELS[Number(e.detail.value)])}
          >
            <View className='filter-picker'>{level ? MEMBER_LEVEL_NAMES[level] : '全等级'}</View>
          </Picker>
        </View>
        <View className='filter-row'>
          <Picker
            mode='selector'
            range={PHONE_BOUND_OPTS.map(o => o.label)}
            onChange={(e) => setPhoneBound(PHONE_BOUND_OPTS[Number(e.detail.value)].key)}
          >
            <View className='filter-picker'>{PHONE_BOUND_OPTS.find(o => o.key === phoneBound)?.label || '手机号'}</View>
          </Picker>
          <Input
            className='filter-input small'
            value={dateFrom}
            placeholder='开始日期'
            onInput={(e) => setDateFrom(e.detail.value)}
          />
          <Text className='date-sep'>~</Text>
          <Input
            className='filter-input small'
            value={dateTo}
            placeholder='结束日期'
            onInput={(e) => setDateTo(e.detail.value)}
          />
          <Button className='filter-btn' onClick={filter}>查询</Button>
        </View>
      </View>

      {/* 列表 */}
      {members.length === 0 ? (
        <View className='empty'>暂无会员</View>
      ) : (
        <View className='member-list'>
          {members.map((m) => (
            <View key={m.id} className='member-card'>
              <View className='member-header'>
                <Text className='member-no'>{m.member_no}</Text>
                <Picker
                  mode='selector'
                  range={LEVEL_LABELS}
                  onChange={(e) => doChangeLevel(m, LEVELS[Number(e.detail.value)])}
                >
                  <View className={`level-badge lv-${m.level}`}>
                    {MEMBER_LEVEL_NAMES[m.level] || m.level} ▾
                  </View>
                </Picker>
              </View>
              <View className='member-body'>
                <View className='member-info'><Text className='info-label'>昵称</Text><Text className='info-value'>{m.nick_name || m.user_name || m.name || '-'}</Text></View>
                <View className='member-info'><Text className='info-label'>等级</Text><Text className='info-value'>{MEMBER_LEVEL_NAMES[m.level] || m.level}</Text></View>
                <View className='member-info'><Text className='info-label'>积分</Text><Text className='info-value'>{m.points ?? 0}</Text></View>
                <View className='member-info'>
                  <Text className='info-label'>手机号</Text>
                  <Text className='info-value'>{m.phone || '未绑定'}{m.is_phone_bound ? ' ✓' : ''}</Text>
                </View>
                {m.total_catch_weight !== undefined && (
                  <View className='member-info'><Text className='info-label'>累计渔获</Text><Text className='info-value'>{m.total_catch_weight}斤</Text></View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
