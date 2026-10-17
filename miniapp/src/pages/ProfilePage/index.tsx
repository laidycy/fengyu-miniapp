import { useState, useEffect } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getMemberInfo } from '../../utils/api/members'
import { isLoggedIn, getCachedUserInfo, clearAuth, showToast } from '../../utils/index'
import { getUserInfo } from '../../utils/api/auth'
import { bindPhoneWithWechat } from '../../utils/login'
import { useLoginModal } from '../../hooks/useLoginModal'
import type { MemberInfo } from '../../utils/types'
import './index.scss'

// 服务菜单（对齐线上）
const MENU_GROUPS = [
  {
    title: '我的服务',
    items: [
      { icon: '📅', label: '我的预约', path: '/pages/OrderListPage/index' },
      { icon: '🪙', label: '积分明细', path: '/pages/PointsPage/index' },
      { icon: '🐟', label: '渔获记录', path: '/pages/CatchHistoryPage/index' },
      { icon: '📋', label: '安全须知', path: '/pages/SafetyNoticePage/index' }
    ]
  },
  {
    title: '其他',
    items: [
      { icon: '📞', label: '联系我们', action: 'contact' }
    ]
  }
]

export default function ProfilePage() {
  const login = useLoginModal()
  const [loginUser, setLoginUser] = useState(getCachedUserInfo() || null)
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const isLogin = isLoggedIn()

  const loadUserInfo = async () => {
    try {
      const user = await getUserInfo()
      setLoginUser(user)
      Taro.setStorageSync('userInfo', user)
      const m = user.member
      if (m) setMember(m)
    } catch {
      try {
        const m = await getMemberInfo()
        setMember(m)
      } catch {
        // ignore
      }
    }
  }

  // 登录/退出/绑号后自动同步：重读缓存 + 重新拉取用户/会员数据
  // 依赖 login.authVersion（登录态变化）与 login.showLogin（登录弹窗关闭后刷新）
  useEffect(() => {
    const loggedIn = isLoggedIn()
    setLoginUser(getCachedUserInfo() || null)
    if (!loggedIn) {
      setMember(null)
      setShowPhoneModal(false)
      return
    }
    loadUserInfo()
    // 不再自动弹出绑定手机号弹窗（审核环境 getPhoneNumber 拿不到 code 会误报"授权失败"，
    // 且自动弹窗体验差）。改为用户主动点击"绑定手机号"入口时再弹出。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login.authVersion, login.showLogin])

  // 从会员页等"去绑定手机号"跳转过来的意图：
  // switchTab 无法携带 query（原 ?forceBind=1 会丢失），改用 storage 传递信号
  useDidShow(() => {
    if (Taro.getStorageSync('__forceBindPhone')) {
      Taro.removeStorageSync('__forceBindPhone')
      if (isLoggedIn() && !getCachedUserInfo()?.isPhoneBound) {
        setShowPhoneModal(true)
      }
    }
  })

  // 头部点击
  const handleHeaderTap = () => {
    if (isLogin) {
      Taro.navigateTo({ url: '/pages/ProfileInfoPage/index' })
    } else {
      login.openLogin()
    }
  }

  // 菜单点击
  const handleMenuClick = (item: any) => {
    if (item.action === 'contact') {
      // 联系我们：客服 + 现场负责人 两个号码可选
      Taro.showActionSheet({
        itemList: ['客服电话 13800000000', '现场负责人（陈工）13800000001'],
        success: (res) => {
          if (res.tapIndex === 0) {
            Taro.makePhoneCall({ phoneNumber: '13800000000' })
          } else if (res.tapIndex === 1) {
            Taro.makePhoneCall({ phoneNumber: '13800000001' })
          }
        }
      })
    } else if (item.path) {
      Taro.navigateTo({ url: item.path })
    } else {
      showToast(`${item.label}功能即将开放，敬请期待`, 'none')
    }
  }

  // 退出登录
  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearAuth()
          setLoginUser(null)
          setMember(null)
          showToast('已退出登录', 'success')
        }
      }
    })
  }

  // 手机号绑定
  const handleGetPhoneNumber = async (e: any) => {
    const code = e.detail?.code
    const errMsg = e.detail?.errMsg || ''
    if (!code) {
      console.error('[绑定手机号] 微信未返回 code, errMsg:', errMsg)
      // 区分"用户主动拒绝"与"能力未开通/无权限"：让审核/用户看到真实原因
      if (errMsg.includes('deny') || errMsg.includes('denied') || errMsg.includes('user')) {
        showToast('已取消手机号授权', 'none')
      } else if (errMsg.includes('no permission') || errMsg.includes('permission')) {
        showToast('未开通手机号授权能力，请联系管理员', 'none')
      } else if (errMsg) {
        showToast(`授权失败：${errMsg}`, 'none')
      } else {
        showToast('授权失败，请重试', 'none')
      }
      return
    }
    const ok = await bindPhoneWithWechat(code)
    if (ok) {
      setShowPhoneModal(false)
      loadUserInfo()
    }
  }

  const memberPoints = member?.points ?? loginUser?.member?.points ?? '-'
  const memberQuota = member?.welfareFishQuota ?? loginUser?.member?.welfareFishQuota ?? '-'
  const memberLocked = (member as any)?.locked_points ?? (loginUser?.member as any)?.lockedPoints ?? 0

  return (
    <View className='page profile-page'>
      {/* 头部 */}
      <View className='profile-header' onClick={handleHeaderTap}>
        <View className='profile-user'>
          <View className='profile-avatar'>
            {loginUser?.avatarUrl ? (
              <Image className='profile-avatar-img' src={loginUser.avatarUrl} mode='aspectFill' />
            ) : (
              <Text className='profile-avatar-default'>👤</Text>
            )}
          </View>
          <View className='profile-info'>
            {isLogin && loginUser ? (
              <>
                <View className='profile-name-row'>
                  <Text className='profile-name'>{loginUser.nickName || '游客'}</Text>
                  {loginUser.isPhoneBound && (
                    <Text className='profile-phone-badge'>📱 已绑定</Text>
                  )}
                </View>
                {loginUser.isPhoneBound && loginUser.phone ? (
                  <Text className='profile-phone'>{maskPhone(loginUser.phone)}</Text>
                ) : null}
                <Text className='profile-level'>🟢 在线</Text>
              </>
            ) : (
              <>
                <Text className='profile-name'>未登录</Text>
                <Text className='profile-level'>👤 点击登录体验完整功能</Text>
              </>
            )}
          </View>
          <Text className='profile-arrow'>›</Text>
        </View>

        <View className='profile-stats'>
          <View className='profile-stat'>
            <Text className='profile-stat-value'>{isLogin ? memberPoints : '-'}</Text>
            <Text className='profile-stat-label'>可用积分</Text>
          </View>
          <View className='profile-stat'>
            <Text className='profile-stat-value'>{isLogin ? memberLocked : '-'}</Text>
            <Text className='profile-stat-label'>锁定积分</Text>
          </View>
          <View className='profile-stat'>
            <Text className='profile-stat-value'>{isLogin ? memberQuota : '-'}</Text>
            <Text className='profile-stat-label'>福利鱼(斤)</Text>
          </View>
        </View>
      </View>

      {/* 菜单区 */}
      <View className='menu-area'>
        {MENU_GROUPS.map(group => (
          <View key={group.title} className='menu-group'>
            <Text className='menu-group-title'>{group.title}</Text>
            {group.items.map(item => (
              <View
                key={item.label}
                className='menu-item'
                onClick={() => handleMenuClick(item)}
              >
                <Text className='menu-item-icon'>{item.icon}</Text>
                <Text className='menu-item-label'>{item.label}</Text>
                <Text className='menu-item-arrow'>›</Text>
              </View>
            ))}
          </View>
        ))}

        {isLogin && !loginUser?.isPhoneBound && (
          <View className='menu-group'>
            <View className='menu-item' onClick={() => setShowPhoneModal(true)}>
              <Text className='menu-item-icon'>📱</Text>
              <Text className='menu-item-label'>绑定手机号</Text>
              <Text className='menu-item-arrow'>›</Text>
            </View>
          </View>
        )}

        {isLogin && (
          <View className='menu-group'>
            <View className='menu-item menu-item-danger' onClick={handleLogout}>
              <Text className='menu-item-icon'>🚪</Text>
              <Text className='menu-item-label'>退出登录</Text>
            </View>
          </View>
        )}
      </View>

      <Text className='version-info'>丰鱼天下 V0.1.4</Text>

      {/* 手机号绑定弹窗 */}
      {showPhoneModal && (
        <View className='phone-modal-mask' onClick={() => setShowPhoneModal(false)}>
          <View className='phone-modal' onClick={e => e.stopPropagation()}>
            <View className='phone-modal-close' onClick={() => setShowPhoneModal(false)}>
              <Text className='phone-modal-close-icon'>✕</Text>
            </View>
            <Text className='phone-modal-title'>绑定手机号</Text>
            <Text className='phone-modal-desc'>绑定手机号后，可正常预约、开通会员、接收通知。</Text>
            <Button
              className='phone-modal-btn'
              openType='getPhoneNumber'
              onGetPhoneNumber={handleGetPhoneNumber}
            >
              手机号快捷登录
            </Button>
            <Text className='phone-modal-skip' onClick={() => setShowPhoneModal(false)}>暂不绑定</Text>
          </View>
        </View>
      )}

      {login.renderLogin}
    </View>
  )
}

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
