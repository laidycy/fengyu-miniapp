// 手机号快捷登录弹窗 —— 完全按微信官方指引重做
// 规范要点：
// 1. 主按钮用 openType="getPhoneNumber"，文案为"手机号快捷登录"（不出现"微信"字样/logo/微信绿）
// 2. 隐私协议默认【不勾选】——用户自主阅读后自行勾选同意，未勾选不触发登录（不默认强制同意）
// 3. 登录链路：勾选协议 → 点"手机号快捷登录" → 静默 wx.login 注册拿 token → 未绑手机号则自动弹官方手机号授权 → 绑号完成
// 4. 登录成功（资料完善用户）：弹"欢迎回来"卡片 —— 尊敬的xxx（银卡/金卡…）会员，您还有 xx 斤福利鱼，2秒后自动关闭
import { useState, useEffect } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { loginWithWechat, bindPhoneWithWechat } from '../../utils/login'
import { showToast, getCachedUserInfo } from '../../utils/index'
import { isProfileComplete, resetProfileGuideCooldown, goCompleteProfile } from '../../utils/profileGuide'
import { MEMBER_LEVEL_SHORT } from '../../utils/config'
import './index.scss'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface WelcomeInfo {
  nick: string
  levelShort: string
  quota: number
}

// 欢迎卡片展示时长（毫秒）
const WELCOME_DURATION = 2000

export default function PhoneLoginModal({ visible, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [bindOpen, setBindOpen] = useState(false)
  const [welcome, setWelcome] = useState<WelcomeInfo | null>(null)

  // 每次打开弹窗时重置状态（避免上次的"绑定手机号步骤"残留）
  useEffect(() => {
    if (visible) {
      setAgreed(false)
      setBindOpen(false)
      setLoading(false)
      setWelcome(null)
    }
  }, [visible])

  // 欢迎卡片：展示 2 秒后自动关闭并收尾（关弹窗 + 回调 + 完善资料引导）
  useEffect(() => {
    if (!welcome) return
    const timer = setTimeout(() => {
      setWelcome(null)
      finishLogin()
    }, WELCOME_DURATION)
    return () => clearTimeout(timer)
  }, [welcome])

  if (!visible && !welcome) return null

  const toggleAgree = () => setAgreed(!agreed)

  const goToPrivacy = (e?: any) => {
    e?.stopPropagation()
    Taro.navigateTo({ url: '/pages/PrivacyPolicyPage/index' })
  }

  const goToUserAgreement = (e?: any) => {
    e?.stopPropagation()
    Taro.navigateTo({ url: '/pages/UserAgreementPage/index' })
  }

  const goToSafetyNotice = (e?: any) => {
    e?.stopPropagation()
    Taro.navigateTo({ url: '/pages/SafetyNoticePage/index' })
  }

  // 登录真正收尾（欢迎卡片关闭 / 无需欢迎卡片时）：
  // 1) 回调 onSuccess 2) 关弹窗 3) 资料不完善则引导去完善（defer 场景除外）
  const finishLogin = () => {
    // 先回调成功（此时仍持有 successRef），再关闭
    onSuccess?.()
    onClose()
    // 登录后引导完善资料：资料不完善（昵称默认 或 未绑手机）→ 跳完善资料整页
    // 用 setTimeout 等 onClose 完成页面关闭/刷新后再跳，避免导航冲突
    // 例外：当 __deferProfileAfterLogin 打开（如扫码兑换页登录后需先核销兑换码），由业务页自行跳完善
    setTimeout(() => {
      if (Taro.getStorageSync('__deferProfileAfterLogin')) return
      const u = Taro.getStorageSync('userInfo')
      if (u && !isProfileComplete(u)) {
        resetProfileGuideCooldown() // 允许立即进入完善页（不被30天节流拦）
        goCompleteProfile()
      }
    }, 350)
  }

  // 第一步：勾选协议后触发"手机号快捷登录"
  // 未勾选 → 提示，不触发授权（不默认同意）
  const handleQuickLogin = async () => {
    if (!agreed) {
      showToast('请先阅读并同意用户协议、隐私政策及安全须知', 'none')
      return
    }
    setLoading(true)
    // 静默 wx.login 注册/登录，拿 token（不弹窗）
    const success = await loginWithWechat()
    setLoading(false)
    if (!success) {
      showToast('登录失败，请重试', 'none')
      return
    }
    // 已登录：检查是否已绑定手机号
    const userInfo = Taro.getStorageSync('userInfo')
    if (userInfo && !userInfo.isPhoneBound) {
      // 未绑手机号 → 自动弹出官方手机号授权
      setBindOpen(true)
    } else {
      handleDone()
    }
  }

  // 第二步：微信官方 getPhoneNumber 绑定手机号（code 非短信）
  const handleGetPhoneNumber = async (e: any) => {
    const code = e.detail?.code
    const errMsg = e.detail?.errMsg || ''
    if (!code) {
      console.error('[绑定手机号] 微信未返回 code, errMsg:', errMsg)
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
      setBindOpen(false)
      handleDone()
    }
  }

  // 登录成功统一出口：资料完善 → 弹"欢迎回来"卡片（2秒自动关）；资料不完善 → 直接走完善引导
  const handleDone = () => {
    const u = getCachedUserInfo()
    if (!u || !isProfileComplete(u)) {
      showToast('登录成功', 'success')
      finishLogin()
      return
    }
    // 资料完善 → 欢迎卡片（昵称/等级卡名/福利鱼额度）
    const member = u.member || {}
    const level = String(member.level || 'guest')
    setWelcome({
      nick: (u.nickName && String(u.nickName).trim()) ? u.nickName : '用户',
      levelShort: MEMBER_LEVEL_SHORT[level] || '普通',
      quota: Number(member.welfareFishQuota ?? 0) || 0
    })
  }

  // 用户主动关闭（暂不登录/随便看看/点遮罩）→ 标记冷却，避免反复自动弹出
  const skipLogin = () => {
    onClose()
  }

  const closeWelcome = () => {
    setWelcome(null)
    finishLogin()
  }

  // ============ 渲染 ============
  // 登录成功欢迎卡片：无视 visible（visible 可能已被父级置 false），自身作为覆盖层渲染
  if (welcome) {
    return (
      <View className='welcome-mask'>
        <View className='welcome-card'>
          <View className='welcome-check'>✓</View>
          <View className='welcome-title'>登录成功</View>
          <Text className='welcome-line1'>
            尊敬的{welcome.nick}（{welcome.levelShort}）会员
          </Text>
          <Text className='welcome-line2'>您还有{welcome.quota}斤福利鱼</Text>
          <Text className='welcome-auto-close'>2秒后自动关闭</Text>
          <View className='welcome-close' onClick={closeWelcome}>×</View>
        </View>
      </View>
    )
  }

  return (
    <View className='login-mask' onClick={skipLogin}>
      <View className='login-modal' onClick={(e) => e.stopPropagation()}>
        <View className='login-close' onClick={skipLogin}>×</View>

        <View className='login-brand'>
          <Image className='login-logo' src={require('../../assets/logo.png')} mode='aspectFit' />
          <Text className='login-name'>丰鱼天下</Text>
          <Text className='login-sub'>前山水库 · 智慧垂钓</Text>
        </View>

        {/* 未绑手机号时：先快捷登录，再弹官方手机号授权 */}
        {!bindOpen ? (
          <View className='login-body'>
            <Text className='login-desc'>登录后享受完整的预约、会员和渔获记录服务</Text>

            <Button
              className='login-btn'
              loading={loading}
              onClick={handleQuickLogin}
            >
              手机号快捷登录
            </Button>

            {/* 协议同意区：默认不勾选，用户自主阅读后自行选择 */}
            <View className='login-agree'>
              <View className={`agree-checkbox ${agreed ? 'checked' : ''}`} onClick={toggleAgree}>
                {agreed && <Text className='agree-check'>✓</Text>}
              </View>
              <View className='agree-text' onClick={toggleAgree}>
                我已阅读并同意
              </View>
              <View className='agree-link' onClick={goToUserAgreement}>《用户协议》</View>
              <View className='agree-text' onClick={toggleAgree}>、</View>
              <View className='agree-link' onClick={goToPrivacy}>《隐私政策》</View>
              <View className='agree-text' onClick={toggleAgree}>和</View>
              <View className='agree-link' onClick={goToSafetyNotice}>《安全须知》</View>
            </View>

            <Text className='login-skip' onClick={skipLogin}>暂不登录，随便看看</Text>
          </View>
        ) : (
          <View className='login-body'>
            <Text className='login-desc'>为便于同步预约记录和接收通知，请绑定手机号</Text>
            <Button
              className='login-btn'
              openType='getPhoneNumber'
              onGetPhoneNumber={handleGetPhoneNumber}
            >
              手机号快捷登录
            </Button>
            <Text className='login-skip' onClick={() => { setBindOpen(false); onClose() }}>暂不绑定</Text>
          </View>
        )}
      </View>
    </View>
  )
}
