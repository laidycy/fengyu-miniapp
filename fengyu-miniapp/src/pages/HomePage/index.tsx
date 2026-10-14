import { useState, useEffect } from 'react'
import { View, Text, Swiper, SwiperItem, Map, Image } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'
import { getAnnouncements, getAnnounceUi, type HomeTopMode } from '../../utils/api/announcements'
import { getRanking } from '../../utils/api/members'
import { getOrders } from '../../utils/api/orders'
import type { Announcement, Order, RankingItem } from '../../utils/types'
import { isLoggedIn, getCachedUserInfo } from '../../utils/index'
import { useLoginModal } from '../../hooks/useLoginModal'
import { autoBindInvite } from '../../utils/login'
import { shouldPromptProfileGuide, markProfileGuideShown, goCompleteProfile } from '../../utils/profileGuide'
import { RESERVOIR_LOCATION, RESERVOIR_INTRO } from '../../utils/config'
import { ORDER_STATUS_NAMES, TIME_SLOT_NAMES, TIME_SLOT_RANGES } from '../../utils/config'
import mapMarkerIcon from '../../assets/icons/map-marker.png'
import './index.scss'

// 功能入口（对齐线上）
const ENTRIES = [
  { icon: '📋', label: '我的预约', color: '#E8F5E9', textColor: '#2E7D32', path: '/pages/OrderListPage/index', isTab: false },
  { icon: '🐟', label: '渔获记录', color: '#FFF3E0', textColor: '#FF8F00', path: '/pages/CatchHistoryPage/index', isTab: false },
  { icon: '🏆', label: '钓友排行', color: '#F3E5F5', textColor: '#7C4DFF', path: '/pages/RankingPage/index', isTab: false },
  { icon: '🗺', label: '水库导航', color: '#E3F2FD', textColor: '#1976D2', path: '/pages/NavigationPage/index', isTab: false }
]

// 模块级邀请绑定守卫：整次小程序会话只处理一次，避免 useLoad/useDidShow 重复触发
let __inviteHandled = false

// 日期展示：把后端 ISO 时间戳格式化成"8月31日"（带时区偏移，避免显示 T...Z）
function formatShortDate(val: string): string {
  if (!val) return ''
  // 兼容 "2026-08-31" 或 "2026-08-31T16:00:00.000Z"
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`
  return val
}

// 时段展示："全天 06:00-22:00"
function formatSlot(timeSlot: string): string {
  const name = TIME_SLOT_NAMES[timeSlot] || timeSlot
  const range = TIME_SLOT_RANGES[timeSlot]
  return range ? `${name} ${range}` : name
}

export default function HomePage() {
  const login = useLoginModal()
  const [banners, setBanners] = useState<Announcement[]>([])
  const [upcoming, setUpcoming] = useState<Order[]>([])
  const [hasUser, setHasUser] = useState(isLoggedIn())
  // 首页顶部展示模式：banner=公告轮播（默认） / ranking=钓鱼排行榜
  const [homeMode, setHomeMode] = useState<HomeTopMode>('banner')
  const [topRanking, setTopRanking] = useState<RankingItem[]>([])

  // 温和完善资料提醒：已登录 + 资料不完善 + 距上次>30天 → 弹窗引导（可暂不，不硬拦）
  const maybePromptProfileGuide = () => {
    if (!shouldPromptProfileGuide()) return
    markProfileGuideShown()
    Taro.showModal({
      title: '完善资料',
      content: '设置一个昵称，方便钓友认识你，也用于生成专属会员号。',
      confirmText: '去完善',
      cancelText: '暂不',
      confirmColor: '#2E7D32',
      success: (res) => {
        if (res.confirm) goCompleteProfile()
      },
    })
  }

  // 处理分享进入时携带的邀请码，点开即自动绑定
  const handleInviteCode = (options?: any) => {
    const code = (options?.inviteCode || '') as string
    // 兜底：冷启动时 tabBar 页 onLoad 可能拿不到 query，从全局 launch 缓存取
    const fallback = Taro.getStorageSync('__launchInviteCode')
    const finalCode = code || fallback
    if (!finalCode || __inviteHandled) return
    __inviteHandled = true
    if (fallback) Taro.removeStorageSync('__launchInviteCode')
    // 绑定完成后 autoBindInvite 内部会 toast
    autoBindInvite(finalCode, false)
  }

  // 冷启动：经由分享链接进入（tabBar 页 onLoad 可拿到 query）
  useLoad((options) => {
    handleInviteCode(options)
  })

  // 热启动：小程序已打开时点开分享，onShow 携带 query
  useDidShow((options) => {
    handleInviteCode(options)
  })

  // 登录/退出后自动同步"我的预约"展示（依赖 login.authVersion）
  useEffect(() => {
    loadHomeTop()
    const loggedIn = isLoggedIn()
    setHasUser(loggedIn)
    if (loggedIn) {
      loadUpcoming()
    } else {
      setUpcoming([])
    }
    // 温和提醒：已登录但资料不完善 且 距上次提示>30天 → 弹窗引导（不硬拦）
    maybePromptProfileGuide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login.authVersion])

  // 读取首页顶部展示配置，决定拉公告(轮播)还是钓鱼排行榜(榜单卡)
  const loadHomeTop = async () => {
    try {
      const ui = await getAnnounceUi()
      const mode = ui?.homeTopMode === 'ranking' ? 'ranking' : 'banner'
      setHomeMode(mode)
      if (mode === 'ranking') {
        loadTopRanking()
      } else {
        loadBanners()
      }
    } catch {
      // 读取配置失败：回退公告栏（保持原状）
      setHomeMode('banner')
      loadBanners()
    }
  }

  // 首页顶部钓鱼排行榜（年度总渔获，取前三名）
  const loadTopRanking = async () => {
    try {
      const data = await getRanking('yearly')
      setTopRanking((data || []).slice(0, 3))
    } catch {
      setTopRanking([])
      // 排行拉取失败：仍占位显示（空态引导去完整榜）
    }
  }

  // 公告 = banner 数据源
  const loadBanners = async () => {
    try {
      const data = await getAnnouncements()
      if (data && data.length) {
        // 后端已按 status='published' 过滤 + sort_order ASC，这里仅兜底排序
        const published = [...data].sort((a, b) => a.sort_order - b.sort_order)
        setBanners(published)
      }
    } catch {
      // 静默失败，banner 为空
    }
  }

  // 我的预约（进行中的订单）
  const loadUpcoming = async () => {
    try {
      const res = await getOrders({ page: 1, pageSize: 10 })
      const active = (res.list || []).filter(
        o => o.status === 'pending' || o.status === 'confirmed'
      )
      setUpcoming(active)
    } catch {
      // ignore
    }
  }

  // banner 点击 → 公告详情
  const handleBannerTap = (id: string) => {
    Taro.navigateTo({ url: `/pages/AnnounceDetailPage/index?id=${id}` })
  }

  // 首页顶部排行榜卡点击 → 完整钓友排行页
  const goRanking = () => {
    Taro.navigateTo({ url: '/pages/RankingPage/index' })
  }

  // 立即预约 → 预约页
  const goBooking = () => {
    Taro.switchTab({ url: '/pages/BookingPage/index' })
  }

  // 功能入口
  const handleEntry = (entry: typeof ENTRIES[0]) => {
    if (entry.isTab) {
      Taro.switchTab({ url: entry.path })
    } else {
      Taro.navigateTo({ url: entry.path })
    }
  }

  // 我的预约卡片点击
  const handleUpcomingTap = (order: Order) => {
    if (order.status === 'pending') {
      // 待支付订单：直接进订单详情并拉起支付，保留该订单上下文
      // （原实现 switchTab 到预约页会丢失具体订单信息）
      Taro.navigateTo({ url: `/pages/OrderDetailPage/index?id=${order.id}&action=pay` })
    } else {
      Taro.navigateTo({ url: `/pages/OrderDetailPage/index?id=${order.id}` })
    }
  }

  return (
    <View className='page home-page'>
      {/* 顶部展示区：公告轮播 或 钓鱼排行榜（由 web 后台"首页顶部展示"切换） */}
      {homeMode === 'ranking' ? (
        <View className='ranking-top-wrap'>
          <View className='ranking-top-card' onClick={goRanking}>
            <View className='rtc-head'>
              <Text className='rtc-title'>🏆 {new Date().getFullYear()} 钓友风云榜</Text>
              <Text className='rtc-more'>完整榜单 ›</Text>
            </View>
            <View className='rtc-body'>
              {topRanking.length === 0 ? (
                <View className='rtc-empty'>
                  <Text className='rtc-empty-text'>暂无排行数据</Text>
                </View>
              ) : (
                topRanking.map(item => {
                  const rank = item.rank || (topRanking.indexOf(item) + 1)
                  const isFirst = rank === 1
                  return (
                    <View
                      key={item.user_id}
                      className={`rtc-item ${isFirst ? 'first' : ''} ${rank === 2 ? 'second' : ''} ${rank === 3 ? 'third' : ''}`}
                    >
                      <Text className='rtc-rank-badge'>{rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}</Text>
                      <View className='rtc-avatar-wrap'>
                        {item.avatar ? (
                          <Image className='rtc-avatar' src={item.avatar} mode='aspectFill' />
                        ) : (
                          <View className='rtc-avatar rtc-avatar-default'>🐟</View>
                        )}
                      </View>
                      <Text className='rtc-name'>{item.user_name || '匿名钓友'}</Text>
                      <Text className={`rtc-weight ${isFirst ? 'first' : ''}`}>
                        {Number(item.total_weight || 0).toFixed(1)}
                        <Text className='rtc-unit'> 斤</Text>
                      </Text>
                    </View>
                  )
                })
              )}
            </View>
          </View>
        </View>
      ) : (
        <View className='banner-wrap'>
          <Swiper
            className='banner-swiper'
            indicatorColor='rgba(255,255,255,0.5)'
            indicatorActiveColor='#fff'
            circular
            autoplay
          >
            {banners.map(item => (
              <SwiperItem key={item.id}>
                <View
                  className='banner-item'
                  style={{ background: `linear-gradient(135deg, ${item.color || '#2E7D32'}, ${item.color || '#2E7D32'}cc)` }}
                  onClick={() => handleBannerTap(item.id)}
                >
                  <Text className='banner-title'>{item.title}</Text>
                  <Text className='banner-subtitle'>{item.subtitle}</Text>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}

      {/* 立即预约钓位 */}
      <View className='booking-btn-wrap' onClick={goBooking}>
        <View className='booking-btn'>
          <Text className='booking-btn-text'>立即预约钓位</Text>
        </View>
      </View>

      {/* 四宫格入口 */}
      <View className='entries-grid'>
        {ENTRIES.map(entry => (
          <View
            key={entry.label}
            className='entry-item'
            onClick={() => handleEntry(entry)}
          >
            <View className='entry-icon' style={{ backgroundColor: entry.color }}>
              <Text style={{ color: entry.textColor, fontSize: '32rpx' }}>{entry.icon}</Text>
            </View>
            <Text className='entry-label'>{entry.label}</Text>
          </View>
        ))}
      </View>

      {/* 我的预约（进行中） */}
      {hasUser && upcoming.length > 0 && (
        <View className='section upcoming-section'>
          <Text className='section-title'>我的预约</Text>
          {upcoming.map(order => (
            <View
              key={order.id}
              className='upcoming-card'
              onClick={() => handleUpcomingTap(order)}
            >
              <View className='upcoming-card-left'>
                <View className='upcoming-status'>
                  <View className={`upcoming-status-dot status-${order.status}`} />
                  <Text className={`upcoming-status-text status-text-${order.status}`}>
                    {ORDER_STATUS_NAMES[order.status]}
                  </Text>
                </View>
                <Text className='upcoming-date'>📅 {formatShortDate(order.date)}</Text>
                <Text className='upcoming-slot'>{formatSlot(order.timeSlot)}</Text>
              </View>
              <View className='upcoming-card-right'>
                <Text className='upcoming-amount'>¥{order.deposit}</Text>
                <Text className='upcoming-people'>{order.peopleCount}人</Text>
                <Text className='upcoming-arrow'>→</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 水库简介 */}
      <View className='section'>
        <Text className='section-title'>水库简介</Text>
        <View className='intro-card'>
          <View className='intro-banner' onClick={() => Taro.navigateTo({ url: '/pages/NavigationPage/index' })}>
            <Map
              className='intro-map'
              longitude={RESERVOIR_LOCATION.longitude}
              latitude={RESERVOIR_LOCATION.latitude}
              scale={13}
              markers={[{
                id: 1,
                longitude: RESERVOIR_LOCATION.longitude,
                latitude: RESERVOIR_LOCATION.latitude,
                iconPath: mapMarkerIcon,
                width: 32,
                height: 40
              }]}
              style={{ width: '100%', height: '100%' }}
              enableZoom={false}
              enableScroll={false}
            />
            <View className='intro-banner-overlay'>
              <Text>📍 {RESERVOIR_LOCATION.name}</Text>
            </View>
            <View className='intro-banner-arrow'>
              <Text>查看导航 →</Text>
            </View>
          </View>
          <View className='intro-content'>
            <Text className='intro-text'>{RESERVOIR_INTRO}</Text>
            <View className='intro-stats'>
              <Text className='intro-stat'>👥 可容纳200人</Text>
              <Text className='intro-stat'>🐟 10+ 鱼种</Text>
              <Text className='intro-stat'>🏆 328位会员</Text>
            </View>
          </View>
        </View>
      </View>

      {login.renderLogin}
    </View>
  )
}
