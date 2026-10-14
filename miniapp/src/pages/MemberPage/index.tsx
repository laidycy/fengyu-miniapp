import { useState, useEffect } from 'react'
import { View, Text, Image, Input, Button } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { getMemberInfo, getMyInvite, bindInvite, redeemCode } from '../../utils/api/members'
import { getPricingConfig } from '../../utils/api/pricing'
import { payForMemberLevel } from '../../utils/payment'
import { MEMBER_LEVELS, MEMBER_LEVEL_NAMES } from '../../utils/config'
import { isLoggedIn, getCachedUserInfo, showToast } from '../../utils/index'
import { getUserInfo } from '../../utils/api/auth'
import { useLoginModal } from '../../hooks/useLoginModal'
import type { MemberInfo } from '../../utils/types'
import './index.scss'

// 会员卡背景色（按等级）
const LEVEL_BG: Record<string, string> = {
  guest: 'linear-gradient(135deg, #8D8D8D, #BDBDBD)',
  silver: 'linear-gradient(135deg, #9E9E9E, #CFCFCF)',
  gold: 'linear-gradient(135deg, #F9A825, #FFD54F)',
  diamond: 'linear-gradient(135deg, #1565C0, #42A5F5)'
}

export default function MemberPage() {
  const login = useLoginModal()
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [userInfo, setUserInfo] = useState(getCachedUserInfo() || null)
  const [inviteInfo, setInviteInfo] = useState<{ inviteCode: string; invitedBy: string | null; inviteCount: number } | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('silver')
  const [showBindModal, setShowBindModal] = useState(false)
  const [bindValue, setBindValue] = useState('')
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemValue, setRedeemValue] = useState('')
  const [loading, setLoading] = useState(false)
  // 会员等级/价格：默认用前端写死的兜底值，加载后以后端 /api/config/pricing 为准（后端改价前端不用发版）
  const [levels, setLevels] = useState(MEMBER_LEVELS)

  const isLogin = isLoggedIn()
  const level = member?.level || userInfo?.member?.level || 'guest'
  const levelName = MEMBER_LEVEL_NAMES[level] || '普通会员'

  // 分享邀请：把邀请码带进分享链接，好友点开即自动绑定
  // 分享落地页为首页（tabBar 页可带 query，供 useLoad/useDidShow 读取）
  useShareAppMessage(() => ({
    title: '邀请你开通丰鱼天下会员，一起钓鱼吧！',
    path: `/pages/HomePage/index?inviteCode=${inviteInfo?.inviteCode || ''}`,
    imageUrl: undefined
  }))

  // 登录/退出/绑号后自动同步：重新拉取会员数据（依赖 login.authVersion）
  useEffect(() => {
    if (isLoggedIn()) {
      loadData()
    } else {
      // 退出登录 → 清空会员相关展示，恢复游客态
      setUserInfo(null)
      setMember(null)
      setInviteInfo(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login.authVersion])

  const loadData = async () => {
    try {
      const user = await getUserInfo()
      setUserInfo(user)
      setMember(user.member || null)
      Taro.setStorageSync('userInfo', user)
    } catch { /* ignore */ }
    try {
      const m = await getMemberInfo()
      setMember(m)
    } catch { /* ignore */ }
    try {
      const inv = await getMyInvite()
      setInviteInfo({ inviteCode: inv.inviteCode, invitedBy: inv.invitedBy, inviteCount: inv.inviteCount || 0 })
    } catch { /* ignore */ }
    // 用后端真实会员价格覆盖前端写死的价格（银/金/钻 1.2/1.4/1.6）
    try {
      const pricing = await getPricingConfig()
      const levelsArr = pricing?.memberLevels || []
      if (levelsArr.length) {
        setLevels(prev => prev.map(p => {
          const remote = levelsArr.find((r: any) => r.level === p.level)
          if (!remote) return p
          const rp = Number((remote as any).points ?? remote.pointsBonus)
          return {
            ...p,
            // 后端价格单位是元，直接覆盖；积分以后端为准（0 也要采用，不能用 || 回退）
            price: Number(remote.price) || p.price,
            pointsBonus: Number.isFinite(rp) ? rp : p.pointsBonus
          }
        }))
      }
    } catch { /* ignore */ }
  }

  // 点击会员卡/开通会员
  const handleOpenUpgrade = () => {
    if (!isLogin) {
      login.openLogin()
      return
    }
    if (!userInfo?.isPhoneBound) {
      Taro.showModal({
        title: '需要绑定手机号',
        content: '预约/开通会员需要先绑定手机号，是否前往绑定？',
        confirmText: '去绑定',
        cancelText: '暂不',
        success: (res) => {
          if (res.confirm) {
            // switchTab 无法携带 query，改用 storage 传递"去绑定手机号"意图
            Taro.setStorageSync('__forceBindPhone', 1)
            Taro.switchTab({ url: '/pages/ProfilePage/index' })
          }
        }
      })
      return
    }
    setSelectedLevel('silver')
    setShowUpgradeDialog(true)
  }

  // 升级支付
  const handleUpgrade = async (lv: string) => {
    setLoading(true)
    const ok = await payForMemberLevel(lv as any)
    setLoading(false)
    if (ok) {
      setShowUpgradeDialog(false)
      showToast('会员开通成功', 'success')
      loadData()
    }
  }

  // 复制邀请码
  const handleCopyInviteCode = () => {
    const code = inviteInfo?.inviteCode || ''
    if (!code) return
    Taro.setClipboardData({
      data: `我的丰鱼天下邀请码：${code}，注册/开通会员时填写即可。`,
      success: () => showToast('邀请码已复制', 'success')
    })
  }

  // 绑定邀请码
  const handleBindInvite = async () => {
    if (!bindValue.trim()) {
      showToast('请输入邀请码', 'none')
      return
    }
    setLoading(true)
    try {
      await bindInvite(bindValue.trim().toUpperCase())
      setLoading(false)
      setShowBindModal(false)
      setBindValue('')
      showToast('绑定成功', 'success')
      loadData()
    } catch (err: any) {
      setLoading(false)
      showToast(err.message || '绑定失败', 'none')
    }
  }

  // 可升级的等级（当前等级之后的），价格/积分以后端配置为准
  const availableUpgrades = levels.filter(l => l.level !== level)

  // 兑换码兑换入口：打开自定义弹窗
  const handleOpenRedeem = () => {
    if (!isLoggedIn()) {
      login.openLogin()
      return
    }
    setRedeemValue('')
    setShowRedeemModal(true)
  }

  // 扫码填入兑换码
  const handleScanRedeem = () => {
    Taro.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        const code = String(res.result || '').trim()
        if (code) setRedeemValue(code)
      },
      fail: () => {
        // 用户取消扫码，忽略
      }
    })
  }

  // 提交兑换
  const handleSubmitRedeem = async () => {
    const code = String(redeemValue || '').trim()
    if (!code) {
      showToast('请输入或扫描兑换码', 'none')
      return
    }
    setLoading(true)
    try {
      const data = await redeemCode(code)
      setLoading(false)
      setShowRedeemModal(false)
      showToast('兑换成功', 'success')
      // 刷新会员信息（积分/等级/福利鱼）
      loadData()
      // 展示兑换所得
      const b = data?.benefits || {}
      const parts: string[] = []
      if (b.level) parts.push(`等级升级为${MEMBER_LEVEL_NAMES[b.level] || b.level}`)
      if (b.points) parts.push(`+${b.points}积分`)
      if (b.fish_quota) parts.push(`+${b.fish_quota}斤福利鱼`)
      if (parts.length) {
        setTimeout(() => Taro.showModal({ title: '兑换成功', content: parts.join('、'), showCancel: false }), 400)
      }
    } catch (err: any) {
      setLoading(false)
      showToast(err?.message || '兑换失败', 'none')
    }
  }

  return (
    <View className='page member-page'>
      {/* 会员卡 */}
      <View className='member-card-main' style={{ background: LEVEL_BG[level] || LEVEL_BG.guest }}>
        <View className='member-card-inner'>
          <View className='member-card-top'>
            <View className='member-card-badge'>
              <Text className='member-card-badge-icon'>👑</Text>
              <Text className='member-card-badge-text'>{levelName}</Text>
            </View>
            <Text className='member-card-no'>No.{member?.memberNo || userInfo?.member?.memberNo || '—'}</Text>
          </View>

          <View className='member-card-info'>
            <View className='member-card-avatar'>
              {userInfo?.avatarUrl ? (
                <Image className='member-card-avatar-img' src={userInfo.avatarUrl} mode='aspectFill' />
              ) : (
                <Text className='member-card-avatar-default'>🐟</Text>
              )}
            </View>
            <View className='member-card-user'>
              <Text className='member-card-name'>{userInfo?.nickName || '钓友'}</Text>
              <Text className='member-card-sub'>前山水库 · 智慧垂钓</Text>
            </View>
          </View>

          <View className='member-card-stats'>
            <View className='card-stat'>
              <Text className='card-stat-value'>{member?.points ?? userInfo?.member?.points ?? 0}</Text>
              <Text className='card-stat-label'>积分</Text>
            </View>
            <View className='card-stat'>
              <Text className='card-stat-value'>{member?.welfareFishQuota ?? userInfo?.member?.welfareFishQuota ?? 0}</Text>
              <Text className='card-stat-label'>福利鱼(斤)</Text>
            </View>
            <View className='card-stat'>
              <Text className='card-stat-value'>{member?.totalCatchWeight ?? userInfo?.member?.totalCatchWeight ?? 0}</Text>
              <Text className='card-stat-label'>总渔获(斤)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 兑换码兑换 */}
      <View className='redeem-card' onClick={handleOpenRedeem}>
        <View className='redeem-card-left'>
          <Text className='redeem-card-icon'>🎟️</Text>
          <View className='redeem-card-texts'>
            <Text className='redeem-card-title'>兑换码兑换</Text>
            <Text className='redeem-card-desc'>输入兑换码，领取等级 / 积分 / 福利鱼</Text>
          </View>
        </View>
        <Text className='redeem-card-arrow'>›</Text>
      </View>

      {/* 邀请朋友 */}
      <View className='invite-card'>
        <View className='invite-header'>
          <View className='invite-title'>
            <Text>🤝</Text>
            <Text>邀请朋友</Text>
          </View>
          <View className='invite-count'>
            <Text className='invite-count-num'>{inviteInfo?.inviteCount ?? 0}</Text>
            <Text className='invite-count-label'>已邀请</Text>
          </View>
        </View>

        <Text className='invite-desc'>
          好友凭你的邀请码开通会员，助你快速升级
          {inviteInfo?.invitedBy ? `｜已由「${inviteInfo.invitedBy}」邀请` : ''}
        </Text>

        <View className='invite-code-row'>
          <View className='invite-code-box'>
            <Text className='invite-code'>{inviteInfo?.inviteCode || '------'}</Text>
          </View>
          <View className='invite-copy-btn' onClick={handleCopyInviteCode}>
            <Text>复制</Text>
          </View>
          <Button className='invite-share-btn' openType='share'>
            <Text>分享邀请</Text>
          </Button>
        </View>

        {!inviteInfo?.invitedBy && isLogin && (
          <View className='invite-bind-link' onClick={() => setShowBindModal(true)}>
            <Text>我有邀请码，填写好友邀请码 ›</Text>
          </View>
        )}

        {(inviteInfo?.inviteCount ?? 0) < 3 && (
          <View className='invite-progress'>
            <View className='invite-progress-bg'>
              <View className='invite-progress-bar' style={{ width: `${Math.min((inviteInfo?.inviteCount ?? 0) * 33.3, 100)}%` }} />
            </View>
            <Text className='invite-progress-text'>
              邀请3位好友开通会员，免费升级金卡会员（当前 {inviteInfo?.inviteCount ?? 0} 人）
            </Text>
          </View>
        )}
      </View>

      {/* 会员权益 */}
      <View className='benefit-card'>
        <View className='section-title'>
          <Text>🎁</Text>
          <Text>会员权益</Text>
        </View>
        <View className='benefit-grid'>
          {getBenefits(level).map((b, i) => (
            <View key={i} className='benefit-cell'>
              <Text className='benefit-cell-star'>⭐</Text>
              <Text className='benefit-cell-text'>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 操作行 */}
      {isLogin && (
        <View className='action-row'>
          {level !== 'diamond' && (
            <View className='upgrade-btn-up' onClick={handleOpenUpgrade}>
              <Text>{level === 'guest' ? '立即开通会员' : '升级会员'}</Text>
            </View>
          )}
          <Button className='invite-btn-up' openType='share'>
            <Text>🤝 邀好友赚积分</Text>
          </Button>
        </View>
      )}

      {/* 未登录时显示开通引导 */}
      {!isLogin && (
        <View className='guest-login-card' onClick={() => login.openLogin()}>
          <Text className='guest-login-title'>登录后查看会员权益</Text>
          <Text className='guest-login-desc'>开通会员享预约折扣、积分回馈等专属权益</Text>
          <View className='guest-login-btn'>
            <Text>立即登录</Text>
          </View>
        </View>
      )}

      {/* 升级弹窗 */}
      {showUpgradeDialog && (
        <View className='dialog-overlay' onClick={() => setShowUpgradeDialog(false)}>
          <View className='dialog-panel' onClick={e => e.stopPropagation()}>
            <View className='dialog-header'>
              <Text className='dialog-title'>{level === 'guest' ? '开通会员' : '升级会员'}</Text>
              <View className='dialog-close' onClick={() => setShowUpgradeDialog(false)}>
                <Text className='dialog-close-icon'>✕</Text>
              </View>
            </View>
            <View className='dialog-body'>
              <View className='upgrade-compare'>
                {availableUpgrades.map(opt => (
                  <View
                    key={opt.level}
                    className={`upgrade-card ${selectedLevel === opt.level ? 'upgrade-card-selected' : ''}`}
                    onClick={() => setSelectedLevel(opt.level)}
                  >
                    <View className={`upgrade-card-badge upgrade-card-badge-${opt.level}`}>
                      <Text className='upgrade-card-badge-icon'>👑</Text>
                    </View>
                    <Text className='upgrade-card-name'>{opt.name}</Text>
                    <View className='upgrade-card-price'>
                      <Text className='upgrade-card-price-num'>¥{opt.price}</Text>
                      <Text className='upgrade-card-price-unit'>/年</Text>
                    </View>
                    <Text className='upgrade-card-points'>赠 {opt.pointsBonus} 积分</Text>
                    <View className='upgrade-card-benefits'>
                      {opt.benefits.map((b, i) => (
                        <Text key={i} className='upgrade-card-benefit'>✓ {b}</Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View className='dialog-footer'>
              <Button
                className='upgrade-confirm-btn'
                loading={loading}
                onClick={() => handleUpgrade(selectedLevel)}
              >
                立即开通 ¥{levels.find(l => l.level === selectedLevel)?.price || 0}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 绑定邀请码弹窗 */}
      {showBindModal && (
        <View className='modal-mask' onClick={() => setShowBindModal(false)}>
          <View className='modal-content' onClick={e => e.stopPropagation()}>
            <Text className='modal-title'>填写好友邀请码</Text>
            <Text className='modal-desc'>绑定后双方可享邀请奖励</Text>
            <Input
              className='invite-input'
              placeholder='请输入邀请码'
              value={bindValue}
              maxlength={10}
              onInput={(e) => setBindValue(e.detail.value)}
            />
            <Button className='modal-btn' loading={loading} onClick={handleBindInvite}>
              确认绑定
            </Button>
          </View>
        </View>
      )}

      {/* 兑换码兑换弹窗 */}
      {showRedeemModal && (
        <View className='modal-mask' onClick={() => setShowRedeemModal(false)}>
          <View className='redeem-modal' onClick={e => e.stopPropagation()}>
            {/* 顶部品牌区 */}
            <View className='redeem-modal-head'>
              <View className='redeem-modal-close' onClick={() => setShowRedeemModal(false)}>✕</View>
              <View className='redeem-modal-icon'>🎟️</View>
              <Text className='redeem-modal-title'>兑换码兑换</Text>
              <Text className='redeem-modal-sub'>输入或扫描兑换码，领取等级 / 积分 / 福利鱼</Text>
            </View>
            {/* 输入区 */}
            <View className='redeem-modal-body'>
              <View className='redeem-input-wrap'>
                <Input
                  className='redeem-input'
                  placeholder='请输入兑换码'
                  placeholderClass='redeem-input-ph'
                  value={redeemValue}
                  maxlength={30}
                  onInput={(e) => setRedeemValue(e.detail.value)}
                />
                <View className='redeem-scan-btn' onClick={handleScanRedeem}>
                  <Text className='redeem-scan-icon'>📷</Text>
                  <Text className='redeem-scan-text'>扫码</Text>
                </View>
              </View>
              <Button
                className='redeem-submit-btn'
                loading={loading}
                onClick={handleSubmitRedeem}
              >
                立即兑换
              </Button>
              <Text className='redeem-modal-tip'>扫码可直接识别卡片上的兑换码</Text>
            </View>
          </View>
        </View>
      )}

      {login.renderLogin}
    </View>
  )
}

// 权益（按等级）
function getBenefits(level: string): string[] {
  const map: Record<string, string[]> = {
    guest: ['基础预约', '浏览公告'],
    silver: ['预约95折', '开通赠68积分'],
    gold: ['预约9折', '开通赠380积分', '优先预约'],
    diamond: ['预约8折', '开通赠680积分', '优先预约', 'VIP钓位']
  }
  return map[level] || map.guest
}
