// 对齐线上 V0.0.5
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import { getUserInfo } from '../../utils/api/auth'
import { isLoggedIn, getCachedUserInfo, setCachedUserInfo, showToast } from '../../utils/index'
import { bindPhoneWithWechat } from '../../utils/login'
import { unbindPhone } from '../../utils/api/auth'
import { useLoginModal } from '../../hooks/useLoginModal'
import ProfileEditor from '../../components/ProfileEditor'
import { MEMBER_LEVEL_NAMES } from '../../utils/config'
import type { UserInfo } from '../../utils/types'
import './index.scss'

// 会员等级对应标签
const LEVEL_BADGE: Record<string, string> = {
  guest: '散客',
  silver: '银卡会员',
  gold: '金卡会员',
  diamond: '钻石会员'
}

export default function ProfileInfoPage() {
  const login = useLoginModal()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(getCachedUserInfo() || null)
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      loadUser()
    }
  }, [])

  const loadUser = async () => {
    try {
      const data = await getUserInfo()
      setUserInfo(data)
      setCachedUserInfo(data)
    } catch {
      showToast('资料加载失败', 'none')
    }
  }

  // 绑定手机号（getPhoneNumber，需已登录）
  const handleGetPhoneNumber = async (e: any) => {
    if (!isLoggedIn()) {
      login.openLogin()
      return
    }
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
    if (ok) loadUser()
  }

  // 解绑手机号（需弹确认）
  const handleUnbindPhone = () => {
    Taro.showModal({
      title: '解绑手机号',
      content: '确定要解绑当前手机号吗？解绑后需重新授权绑定。',
      confirmColor: '#d9534f',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await unbindPhone()
          showToast('已解绑手机号', 'success')
          loadUser()
        } catch (err: any) {
          showToast(err.message || '解绑失败', 'none')
        }
      }
    })
  }

  const member = userInfo?.member
  const levelName = member?.levelName || MEMBER_LEVEL_NAMES[member?.level || 'guest'] || '普通会员'
  const badge = LEVEL_BADGE[member?.level || 'guest']

  return (
    <View className='page profile-info-page'>
      {/* 头部 */}
      <View className={`profile-header ${isLoggedIn() ? 'editable' : ''}`} onClick={() => isLoggedIn() && setShowEditor(true)}>
        <View className='profile-avatar'>
          {userInfo?.avatarUrl ? (
            <Image className='profile-avatar-img' src={userInfo.avatarUrl} mode='aspectFill' />
          ) : (
            <Text className='profile-avatar-default'>👤</Text>
          )}
          {isLoggedIn() && <Text className='profile-avatar-edit'>✎</Text>}
        </View>
        <Text className='profile-nickname'>{userInfo?.nickName || '未登录'}</Text>
        {isLoggedIn() && <Text className='profile-edit-hint'>点击编辑资料</Text>}
        <Text className='profile-level-badge'>{badge}</Text>
        {userInfo?.isPhoneBound ? (
          <Text className='profile-bound-tip'>📱 已绑定手机号</Text>
        ) : (
          <Text className='profile-unbound-tip'>未绑定手机号</Text>
        )}
      </View>

      {/* 会员卡片 */}
      {isLoggedIn() && member ? (
        <View className='member-card'>
          <View className='member-card-head'>
            <View className='member-name-wrap'>
              <Text className='member-level-name'>{levelName}</Text>
              <Text className='member-no'>会员号 {member.memberNo || '-'}</Text>
            </View>
            <Text className='member-price-tag'>V0.1.4</Text>
          </View>

          <View className='member-stats'>
            <View className='member-stat'>
              <Text className='member-stat-value'>{member.points ?? 0}</Text>
              <Text className='member-stat-label'>可用积分</Text>
            </View>
            <View className='member-stat'>
              <Text className='member-stat-value'>{member.lockedPoints ?? 0}</Text>
              <Text className='member-stat-label'>锁定积分</Text>
            </View>
            <View className='member-stat'>
              <Text className='member-stat-value'>{member.totalPoints ?? 0}</Text>
              <Text className='member-stat-label'>累计积分</Text>
            </View>
            <View className='member-stat'>
              <Text className='member-stat-value'>{member.welfareFishQuota ?? 0}</Text>
              <Text className='member-stat-label'>福利鱼(斤)</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* 基本信息 */}
      <View className='section'>
        <Text className='section-title'>基本信息</Text>
        <View className='info-row' onClick={() => isLoggedIn() && setShowEditor(true)}>
          <Text className='info-label'>昵称</Text>
          <View className='info-value info-value-flex'>
            <Text>{userInfo?.nickName || '-'}</Text>
            {isLoggedIn() && <Text className='info-edit-btn'>编辑</Text>}
          </View>
        </View>
        <View className='info-row'>
          <Text className='info-label'>手机号</Text>
          <View className='info-value info-value-flex'>
            {userInfo?.isPhoneBound && userInfo.phone ? (
              <>
                <Text>{maskPhone(userInfo.phone)}</Text>
                {isLoggedIn() && (
                  <Text className='info-unbind-btn' onClick={handleUnbindPhone}>解绑</Text>
                )}
              </>
            ) : (
              <>
                <Text>未绑定</Text>
                {isLoggedIn() && (
                  <Button
                    className='info-bind-btn'
                    openType='getPhoneNumber'
                    onGetPhoneNumber={handleGetPhoneNumber}
                  >
                    绑定
                  </Button>
                )}
              </>
            )}
          </View>
        </View>
        <View className='info-row'>
          <Text className='info-label'>性别</Text>
          <Text className='info-value'>{genderText(userInfo?.gender)}</Text>
        </View>
      </View>

      {/* 会员信息 */}
      <View className='section'>
        <Text className='section-title'>会员信息</Text>
        <View className='info-row'>
          <Text className='info-label'>会员等级</Text>
          <Text className='info-value'>{levelName}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>会员号</Text>
          <Text className='info-value'>{member?.memberNo || '-'}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>累计到访</Text>
          <Text className='info-value'>{member?.totalVisits ?? 0} 次</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>累计消费</Text>
          <Text className='info-value'>{member?.totalSpent ? `¥${member.totalSpent}` : '¥0'}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>邀请码</Text>
          <Text className='info-value'>{member?.inviteCode || '-'}</Text>
        </View>
        {member?.inviteCount !== undefined && (
          <View className='info-row'>
            <Text className='info-label'>已邀请</Text>
            <Text className='info-value'>{member.inviteCount} 人</Text>
          </View>
        )}
        {member?.joinDate && (
          <View className='info-row'>
            <Text className='info-label'>入会时间</Text>
            <Text className='info-value'>{member.joinDate.slice(0, 10)}</Text>
          </View>
        )}
      </View>

      {/* 编辑说明 */}
      {!isLoggedIn() && (
        <View className='login-tip' onClick={() => login.openLogin()}>
          <Text className='login-tip-text'>登录后查看完整会员资料</Text>
          <Text className='login-tip-arrow'>›</Text>
        </View>
      )}

      {login.renderLogin}

      {/* 编辑资料浮层（头像昵称） */}
      {showEditor && isLoggedIn() && (
        <View className='editor-mask' onClick={() => setShowEditor(false)}>
          <View className='editor-sheet' onClick={(e) => e.stopPropagation()}>
            <View className='editor-sheet-head'>
              <Text className='editor-sheet-title'>编辑昵称 / 头像</Text>
              <Text className='editor-sheet-close' onClick={() => setShowEditor(false)}>×</Text>
            </View>
            <ProfileEditor
              nickName={userInfo?.nickName || ''}
              avatarUrl={userInfo?.avatarUrl || ''}
              mode='sheet'
              onSaved={() => {
                setShowEditor(false)
                loadUser()
              }}
            />
          </View>
        </View>
      )}
    </View>
  )
}

// 手机号脱敏
function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

// 性别文案
function genderText(gender?: number) {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '未知'
}
