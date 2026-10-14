// 兑换码兑换页（微信扫小程序码直达 / 手动输入）
// 链路：微信扫小程序码 → 本页 onLoad 拿 scene(兑换码) → 查权益预览 → 立即兑换
//       → 未登录则弹手机号快捷登录（登录成功后自动继续核销）→ 核销成功 → 引导完善资料
import { useState } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useLoginModal } from '../../hooks/useLoginModal'
import { isLoggedIn, showToast, getCachedUserInfo } from '../../utils/index'
import { getRedeemInfo, redeemCode } from '../../utils/api/members'
import { MEMBER_LEVEL_NAMES } from '../../utils/config'
import { deferProfileAfterLogin, goCompleteIfNeeded } from '../../utils/profileGuide'
import './index.scss'

interface RedeemPreview {
  code: string
  valid: boolean
  reason?: string
  benefits: { level?: string | null; points?: number; fish_quota?: number }
}

export default function RedeemCodePage() {
  const login = useLoginModal()
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<RedeemPreview | null>(null)
  const [loading, setLoading] = useState(false) // 展示/切换码时加载
  const [redeeming, setRedeeming] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)

  // 解析 scene（微信扫小程序码冷启动）：scene 可能被 urlencode，兑换码本身无特殊字符
  const parseScene = (scene?: string): string => {
    let s = scene || ''
    try { s = decodeURIComponent(s) } catch { /* ignore */ }
    return String(s).trim().toUpperCase()
  }

  const loadPreview = async (c: string) => {
    if (!c) { setPreview(null); return }
    setLoading(true)
    try {
      const info = await getRedeemInfo(c)
      setPreview({
        code: info.code,
        valid: info.valid,
        reason: info.reason || '',
        benefits: info.benefits || {},
      })
      // 回调后端规范化后的 code（可能大写 trim 了）
      if (info.code && info.code !== c) setCode(info.code)
    } catch (err: any) {
      // 查不到/网络错误
      setPreview({ code: c, valid: false, reason: err?.message || '无法查询该兑换码', benefits: {} })
    } finally {
      setLoading(false)
      setLoadedOnce(true)
    }
  }

  // 进入页面：扫小程序码 scene / navigateTo 带 code / 手动输入后查询
  useLoad((options?: any) => {
    const sceneCode = parseScene(options?.scene)
    const directCode = String(options?.code || '').trim().toUpperCase()
    const c = directCode || sceneCode
    if (c) {
      setCode(c)
      loadPreview(c)
    }
  })

  const handleInput = (e: any) => {
    const v = String(e.detail.value || '').toUpperCase()
    setCode(v)
    // 输入变化时清掉旧预览，避免展示过期的
    if (preview && preview.code !== v) setPreview(null)
    if (!v) setLoadedOnce(false)
  }

  const handleQuery = () => {
    const c = String(code).trim().toUpperCase()
    if (!c) { showToast('请输入兑换码', 'none'); return }
    loadPreview(c)
  }

  // 实际发起核销
  const doRedeem = async () => {
    if (redeeming) return
    if (!preview?.valid) { showToast('该兑换码不可用', 'none'); return }
    setRedeeming(true)
    try {
      const data = await redeemCode(code)
      setRedeeming(false)
      showToast('兑换成功', 'success')
      // 展示兑换所得
      const b = data?.benefits || {}
      const parts: string[] = []
      if (b.level) parts.push(`等级:${MEMBER_LEVEL_NAMES[b.level as any] || b.level}`)
      if (b.points) parts.push(`+${b.points}积分`)
      if (b.fish_quota) parts.push(`+${b.fish_quota}斤福利鱼`)
      Taro.showModal({
        title: '兑换成功',
        content: parts.length ? `恭喜获得：${parts.join('、')}` : '兑换成功',
        showCancel: false,
        confirmText: '好的',
        success: () => {
          // 兑换完成 → 引导完善资料（若资料不完善会自动跳；否则回退）
          goCompleteIfNeeded()
        },
      })
    } catch (err: any) {
      setRedeeming(false)
      // request 已自动 toast 错误
      // 刷新预览状态（可能码刚被用）
      loadPreview(code)
    }
  }

  // 立即兑换入口：未登录先弹登录，登录成功后再核销
  const handleRedeemTap = () => {
    if (!preview?.valid) return
    if (!isLoggedIn()) {
      deferProfileAfterLogin(true) // 阻止登录弹窗自动跳完善页，待核销完成再跳
      login.openLogin(() => { doRedeem() })
      return
    }
    doRedeem()
  }

  const renderBenefit = () => {
    if (!preview || !preview.valid) return null
    const b = preview.benefits || {}
    const parts: Array<{ k: string; v: string }> = []
    if (b.level) parts.push({ k: '会员等级', v: MEMBER_LEVEL_NAMES[b.level as any] || b.level })
    if (b.points) parts.push({ k: '积分', v: `+${b.points}` })
    if (b.fish_quota) parts.push({ k: '福利鱼', v: `+${b.fish_quota}斤` })
    if (!parts.length) parts.push({ k: '说明', v: '专属权益' })
    return (
      <View className='rc-benefit-list'>
        {parts.map((p, i) => (
          <View className='rc-benefit-item' key={i}>
            <Text className='rc-benefit-k'>{p.k}</Text>
            <Text className='rc-benefit-v'>{p.v}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View className='redeem-code-page'>
      <View className='rc-hero'>
        <Text className='rc-hero-title'>🎁 兑换码兑换</Text>
        <Text className='rc-hero-sub'>输入或扫码获得的兑换码，兑换专属福利</Text>
      </View>

      <View className='rc-card'>
        <View className='rc-input-row'>
          <Input
            className='rc-input'
            placeholder='请输入兑换码'
            placeholderClass='rc-input-ph'
            value={code}
            onInput={handleInput}
          />
          <Button className='rc-query-btn' loading={loading} disabled={loading} onClick={handleQuery}>
            查询
          </Button>
        </View>

        {/* 查询结果区 */}
        {loadedOnce && (
          <View className='rc-result'>
            {!preview ? (
              <Text className='rc-result-empty'>请输入兑换码查询可兑权益</Text>
            ) : preview.valid ? (
              <>
                <View className='rc-ok-badge'>✓ 可兑换</View>
                <View className='rc-code-display'>{preview.code}</View>
                {renderBenefit()}
                <Button
                  className='rc-redeem-btn'
                  loading={redeeming}
                  disabled={redeeming}
                  onClick={handleRedeemTap}
                >
                  立即兑换
                </Button>
              </>
            ) : (
              <>
                <View className='rc-invalid-badge'>× {preview.reason || '不可用'}</View>
                <View className='rc-code-display dim'>{preview.code}</View>
              </>
            )}
          </View>
        )}
      </View>

      <Text className='rc-tip'>提示：扫兑换码卡上的二维码即可直达本页并自动填入兑换码</Text>

      {login.renderLogin}
    </View>
  )
}
