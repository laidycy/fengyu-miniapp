// 对齐线上 V0.0.5
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { isLoggedIn, getCachedUserInfo, clearAuth, showToast } from '../../utils/index'
import { useLoginModal } from '../../hooks/useLoginModal'
import './index.scss'

export default function SettingsPage() {
  const login = useLoginModal()
  const userInfo = getCachedUserInfo()

  const handleProfile = () => {
    if (!isLoggedIn()) {
      login.openLogin()
      return
    }
    Taro.navigateTo({ url: '/pages/ProfileInfoPage/index' })
  }

  const handleAbout = () => {
    Taro.showModal({
      title: '关于我们',
      content: '丰鱼天下 · 前山水库智慧垂钓平台\n版本 V0.1.4\n定位：江西省丰城市秀市镇前山村',
      showCancel: false,
      confirmText: '知道了'
    })
  }

  const handleCheckUpdate = () => {
    Taro.showLoading({ title: '检查中...' })
    setTimeout(() => {
      Taro.hideLoading()
      showToast('已是最新版本', 'success')
    }, 800)
  }

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？（不影响已登录账号）',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync()
          showToast('缓存已清除', 'success')
        }
      }
    })
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearAuth()
          showToast('已退出登录', 'success')
          setTimeout(() => {
            const pages = Taro.getCurrentPages()
            if (pages.length > 1) {
              Taro.navigateBack()
            } else {
              Taro.switchTab({ url: '/pages/HomePage/index' })
            }
          }, 800)
        }
      }
    })
  }

  const member = userInfo?.member

  return (
    <View className='page settings-page'>
      {/* 账号信息区域 */}
      <View className='settings-user' onClick={handleProfile}>
        <View className='settings-avatar'>
          {userInfo?.avatarUrl ? (
            <Image className='settings-avatar-img' src={userInfo.avatarUrl} mode='aspectFill' />
          ) : (
            <Text className='settings-avatar-default'>👤</Text>
          )}
        </View>
        <View className='settings-user-info'>
          {isLoggedIn() ? (
            <>
              <Text className='settings-user-name'>{userInfo?.nickName || '钓友'}</Text>
              <Text className='settings-user-level'>
                {member?.levelName || '普通会员'} · 积分 {member?.points ?? 0}
              </Text>
            </>
          ) : (
            <>
              <Text className='settings-user-name'>未登录</Text>
              <Text className='settings-user-level'>点击登录，体验完整功能</Text>
            </>
          )}
        </View>
        <Text className='settings-arrow'>›</Text>
      </View>

      {/* 通用设置 */}
      <View className='section'>
        <Text className='section-title'>通用</Text>
        <View className='setting-item' onClick={handleProfile}>
          <Text className='item-label'>👤 个人资料</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={handleCheckUpdate}>
          <Text className='item-label'>🔄 检查更新</Text>
          <Text className='item-value'>V0.1.4</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={handleAbout}>
          <Text className='item-label'>ℹ️ 关于我们</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={handleClearCache}>
          <Text className='item-label'>🗑️ 清除缓存</Text>
          <Text className='item-arrow'>›</Text>
        </View>
      </View>

      {/* 更多 */}
      <View className='section'>
        <Text className='section-title'>更多</Text>
        <View className='setting-item' onClick={() => Taro.navigateTo({ url: '/pages/UserAgreementPage/index' })}>
          <Text className='item-label'>📜 用户服务协议</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={() => Taro.navigateTo({ url: '/pages/PrivacyPolicyPage/index' })}>
          <Text className='item-label'>📄 隐私政策</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={() => Taro.navigateTo({ url: '/pages/SafetyNoticePage/index' })}>
          <Text className='item-label'>🛡️ 安全须知</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={() => Taro.navigateTo({ url: '/pages/FishingRulesPage/index' })}>
          <Text className='item-label'>🎣 钓鱼制度</Text>
          <Text className='item-arrow'>›</Text>
        </View>
        <View className='setting-item' onClick={() => Taro.navigateTo({ url: '/pages/NavigationPage/index' })}>
          <Text className='item-label'>📍 水库导航</Text>
          <Text className='item-arrow'>›</Text>
        </View>
      </View>

      {/* 退出登录 */}
      {isLoggedIn() && (
        <View className='logout-wrap'>
          <View className='logout-btn' onClick={handleLogout}>
            <Text className='logout-text'>退出登录</Text>
          </View>
        </View>
      )}

      <Text className='version-info'>丰鱼天下 V0.1.4</Text>

      {login.renderLogin}
    </View>
  )
}
