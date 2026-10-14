// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  adminLogin, getAdminStats,
  isAdminLoggedIn, getAdminInfo, setAdminToken, setAdminInfo, clearAdminToken
} from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import type { AdminStatsOverview } from '../../utils/api/admin'
import './index.scss'

interface NavItem {
  icon: string
  title: string
  desc: string
  url: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: '📋', title: '订单管理', desc: '筛选 / 处理 / 改状态', url: '/pages/AdminOrdersPage/index' },
  { icon: '🐟', title: '渔获管理', desc: '录入渔获 / 查看记录', url: '/pages/AdminCatchPage/index' },
  { icon: '👥', title: '会员管理', desc: '筛选 / 改等级', url: '/pages/AdminMembersPage/index' },
  { icon: '📢', title: '公告管理', desc: '发布 / 编辑 / 删除公告', url: '/pages/AdminAnnouncePage/index' }
]

export default function AdminDashPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminName, setAdminName] = useState('管理员')
  const [stats, setStats] = useState<AdminStatsOverview | null>(null)

  useEffect(() => {
    if (isAdminLoggedIn()) {
      setLoggedIn(true)
      const info = getAdminInfo()
      if (info) setAdminName(info.nickName || info.username || '管理员')
      loadStats()
    }
  }, [])

  const loadStats = async () => {
    try {
      const data = await getAdminStats()
      let s: AdminStatsOverview = data || {}
      setAdminName((prev) => prev)
      // 尝试补充管理员名（若接口返回）
      if (data && typeof data === 'object' && (data as any).admin) {
        const a = (data as any).admin
        if (a.nickName || a.nick_name || a.username) {
          setAdminName(a.nickName || a.nick_name || a.username)
        }
      }
      setStats(s)
    } catch {
      setStats(null)
    }
  }

  const handleLogin = async () => {
    if (!username || !password) {
      showToast('请输入账号和密码')
      return
    }
    try {
      const res = await adminLogin(username, password)
      if (res.token) {
        setAdminToken(res.token)
        if (res.admin) {
          setAdminInfo(res.admin)
          setAdminName(res.admin.nickName || res.admin.nick_name || res.admin.username || '管理员')
        }
        setLoggedIn(true)
        showToast('登录成功', 'success')
        loadStats()
      } else {
        showToast('登录失败：未返回 token')
      }
    } catch (e: any) {
      showToast(e.message || '登录失败')
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定退出管理员账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearAdminToken()
          setLoggedIn(false)
          setStats(null)
        }
      }
    })
  }

  const num = (v: any, d = 0) => (v === undefined || v === null ? d : Number(v))

  if (!loggedIn) {
    return (
      <View className='page admin-dash-page'>
        <View className='login-card'>
          <View className='login-header'>
            <Text className='login-logo'>🎣</Text>
            <Text className='login-title'>丰鱼天下 · 管理后台</Text>
            <Text className='login-sub'>V0.1.4 管理员端</Text>
          </View>
          <View className='login-form'>
            <View className='login-field'>
              <Text className='field-label'>账号</Text>
              <Input
                className='field-input'
                value={username}
                placeholder='请输入管理员账号'
                onInput={(e) => setUsername(e.detail.value)}
              />
            </View>
            <View className='login-field'>
              <Text className='field-label'>密码</Text>
              <Input
                className='field-input'
                value={password}
                password
                placeholder='请输入密码'
                onInput={(e) => setPassword(e.detail.value)}
              />
            </View>
            <Button className='login-btn' onClick={handleLogin}>登 录</Button>
          </View>
        </View>
      </View>
    )
  }

  const todayOrders = num(stats?.todayOrders ?? stats?.today_orders)
  const todayRevenue = num(stats?.todayRevenue ?? stats?.today_revenue)
  const totalMembers = num(stats?.totalMembers ?? stats?.total_members)
  const usedToday = num(stats?.usedToday ?? stats?.used_today)
  const totalOrders = num(stats?.totalOrders ?? stats?.total_orders)
  const totalRevenue = num(stats?.totalRevenue ?? stats?.total_revenue)
  const pendingOrders = num(stats?.pendingOrders ?? stats?.pending_orders)
  const newMembersToday = num(stats?.newMembersToday ?? stats?.new_members_today)

  return (
    <View className='page admin-dash-page'>
      {/* 顶部管理员欢迎 */}
      <View className='dash-header'>
        <View className='welcome'>
          <Text className='welcome-title'>你好，{adminName} 👋</Text>
          <Text className='welcome-sub'>欢迎回来，今天也要好好管理哦</Text>
        </View>
        <Text className='logout-link' onClick={handleLogout}>退出</Text>
      </View>

      {/* 统计卡片 */}
      <View className='stats-grid'>
        <View className='stat-card'>
          <Text className='stat-num'>{todayOrders}</Text>
          <Text className='stat-label'>今日订单</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-num'>¥{todayRevenue}</Text>
          <Text className='stat-label'>今日收入</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-num'>{totalMembers}</Text>
          <Text className='stat-label'>会员总数</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-num'>{usedToday}</Text>
          <Text className='stat-label'>今日接待</Text>
        </View>
      </View>

      {/* 累计数据 */}
      <View className='section'>
        <Text className='section-title'>累计数据</Text>
        <View className='data-row'>
          <View className='data-item'>
            <Text className='data-num'>{totalOrders}</Text>
            <Text className='data-label'>累计订单</Text>
          </View>
          <View className='data-item'>
            <Text className='data-num'>¥{totalRevenue}</Text>
            <Text className='data-label'>累计收入</Text>
          </View>
          <View className='data-item'>
            <Text className='data-num'>{pendingOrders}</Text>
            <Text className='data-label'>待处理订单</Text>
          </View>
          <View className='data-item'>
            <Text className='data-num'>{newMembersToday}</Text>
            <Text className='data-label'>今日新增会员</Text>
          </View>
        </View>
      </View>

      {/* 管理功能 */}
      <View className='section'>
        <Text className='section-title'>管理功能</Text>
        {NAV_ITEMS.map((item) => (
          <View
            key={item.title}
            className='nav-item'
            onClick={() => Taro.navigateTo({ url: item.url })}
          >
            <Text className='nav-icon'>{item.icon}</Text>
            <View className='nav-info'>
              <Text className='nav-title'>{item.title}</Text>
              <Text className='nav-desc'>{item.desc}</Text>
            </View>
            <Text className='nav-arrow'>›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
