// 完善资料页（登录后引导/个人中心进入）
// 微信官方「头像昵称填写能力」：昵称必填（一键填微信昵称），头像选填
// 规则：昵称首次从默认"微信用户"改为真实时，后端会把会员号首字母同步为新昵称首字拼音
import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ProfileEditor from '../../components/ProfileEditor'
import { getCachedUserInfo } from '../../utils/index'
import { markProfileGuideShown } from '../../utils/profileGuide'
import './index.scss'

export default function CompleteProfilePage() {
  const [done, setDone] = useState(false)
  const userInfo = getCachedUserInfo() || {}

  const handleSaved = (info: { nickName: string; avatarUrl: string; memberNoChanged: boolean }) => {
    setDone(true)
    markProfileGuideShown() // 记录已引导，30天内不再温和提醒
    // 提示会员号更新
    if (info.memberNoChanged) {
      Taro.showModal({
        title: '会员号已更新',
        content: '昵称已保存，会员号首字母已按新昵称自动更新。',
        showCancel: false,
        confirmText: '知道了',
        success: () => goBack(),
      })
    } else {
      Taro.showToast({ title: '资料已完善', icon: 'success' })
      setTimeout(goBack, 800)
    }
  }

  const goBack = () => {
    // 返回上一页（登录弹窗/个人中心来源）；若无上一页则回首页
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/HomePage/index' })
    }
  }

  if (done) return null

  return (
    <View className='page complete-profile-page'>
      <View className='cpp-header'>
        <Text className='cpp-title'>完善个人资料</Text>
        <Text className='cpp-sub'>设置您的昵称（头像选填）</Text>
      </View>
      <View className='cpp-card'>
        <ProfileEditor
          nickName={userInfo.nickName || ''}
          avatarUrl={userInfo.avatarUrl || ''}
          mode='page'
          onSaved={handleSaved}
        />
      </View>
    </View>
  )
}
