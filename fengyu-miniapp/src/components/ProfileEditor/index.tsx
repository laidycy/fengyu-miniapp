// 资料编辑器（头像昵称）—— 可复用
// 微信官方「头像昵称填写能力」：
// - 头像：button open-type="chooseAvatar"（用户主动点选，可选，非强制）
// - 昵称：<Input type="nickname">（用户点输入框后，键盘上方出现"微信昵称"一键填入；必填）
// 规则：昵称必填；头像可选。提交后调 PUT /api/auth/profile，昵称从默认"微信用户"首次改真实时后端会重算会员号首字母。
import { useState } from 'react'
import { View, Text, Button, Input, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { updateProfile, uploadAvatar, getUserInfo } from '../../utils/api/auth'
import { setCachedUserInfo, showToast } from '../../utils/index'
import { DEFAULT_NICK } from '../../utils/profileGuide'
import './index.scss'

interface Props {
  /** 当前昵称 */
  nickName?: string
  /** 当前头像URL */
  avatarUrl?: string
  /** 保存成功后回调（传最新的昵称/头像/会员号变化） */
  onSaved?: (info: { nickName: string; avatarUrl: string; memberNoChanged: boolean }) => void
  /** 是否展示"头像点击说明"等文案的模式：'page'=整页(完善资料页)，'sheet'=弹层(个人中心编辑) */
  mode?: 'page' | 'sheet'
}

export default function ProfileEditor({ nickName = '', avatarUrl = '', onSaved, mode = 'sheet' }: Props) {
  const [nick, setNick] = useState(nickName)
  const [avatar, setAvatar] = useState(avatarUrl || '')
  const [localAvatar, setLocalAvatar] = useState('') // chooseAvatar 的临时文件路径（未上传）
  const [saving, setSaving] = useState(false)

  const isDefault = !nick || String(nick).trim() === DEFAULT_NICK

  // chooseAvatar 回调：拿到临时路径，先预览，提交时再转 base64 上传
  const onChooseAvatar = (e: any) => {
    const p = e?.detail?.avatarUrl
    if (!p) return
    setLocalAvatar(p)
  }

  // 临时文件 → base64 data URL（mime 按临时路径扩展名推断，避免 PNG 内容标成 jpeg）
  const fileToDataUrl = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const ext = (String(filePath).match(/\.(\w+)(?:\?.*)?$/) || [])[1] || 'png'
        const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' }
        const mime = mimeMap[String(ext).toLowerCase()] || 'png'
        Taro.getFileSystemManager().readFile({
          filePath,
          encoding: 'base64',
          success: (res: any) => {
            const b64 = res?.data || ''
            resolve(`data:image/${mime};base64,${b64}`)
          },
          fail: (err: any) => reject(err),
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  const handleSave = async () => {
    const trimmed = String(nick || '').trim()
    if (!trimmed) {
      showToast('请填写昵称', 'none')
      return
    }
    if (trimmed.length > 20) {
      showToast('昵称最多20个字', 'none')
      return
    }
    setSaving(true)
    try {
      // 1. 若有新选头像（临时文件），先上传拿 url
      let finalAvatar = avatar
      if (localAvatar) {
        try {
          const dataUrl = await fileToDataUrl(localAvatar)
          const up = await uploadAvatar(dataUrl)
          finalAvatar = up?.url || avatar
        } catch (e) {
          console.error('[头像上传失败]', e)
          showToast('头像上传失败，已跳过', 'none')
        }
      }

      // 2. 更新资料（昵称 → 后端会处理会员号首字母重算）
      const res = await updateProfile({ nickName: trimmed, avatarUrl: finalAvatar })

      // 3. 刷新本地缓存
      try {
        const fresh = await getUserInfo()
        setCachedUserInfo(fresh)
      } catch {
        // ignore
      }

      showToast('保存成功', 'success')
      onSaved?.({
        nickName: trimmed,
        avatarUrl: finalAvatar || '',
        memberNoChanged: !!res?.memberNoChanged,
      })
    } catch (err: any) {
      showToast(err?.message || '保存失败', 'none')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='profile-editor'>
      {/* 头像（可选） */}
      <View className='pe-avatar-row'>
        <View className='pe-avatar-wrap'>
          {localAvatar ? (
            <Image className='pe-avatar' src={localAvatar} mode='aspectFill' />
          ) : avatar ? (
            <Image className='pe-avatar' src={avatar} mode='aspectFill' />
          ) : (
            <View className='pe-avatar-empty'>👤</View>
          )}
        </View>
        <Button className='pe-avatar-btn' openType='chooseAvatar' onChooseAvatar={onChooseAvatar}>
          选择头像
        </Button>
        <Text className='pe-avatar-tip'>头像选填</Text>
      </View>

      {/* 昵称（必填） */}
      <View className='pe-nick-row'>
        <Text className='pe-nick-label'>昵称 *</Text>
        <Input
          className='pe-nick-input'
          type='nickname'
          placeholder='请输入昵称'
          placeholderClass='pe-nick-ph'
          value={nick}
          onInput={(e: any) => setNick(e.detail.value)}
        />
        {isDefault && <Text className='pe-nick-hint'>点输入框可一键填入微信昵称</Text>}
      </View>

      <View className='pe-info'>
        {isDefault ? (
          <Text className='pe-info-text'>完善昵称后，您的会员号首字母将按昵称首字自动更新（如：微信用户 → 昵称"阿强" → 会员号开头变 A）</Text>
        ) : (
          <Text className='pe-info-text'>当前昵称已设置，再次修改不会改动会员号（以首次设置为准）</Text>
        )}
      </View>

      <Button
        className='pe-save-btn'
        loading={saving}
        disabled={saving}
        onClick={handleSave}
      >
        保存
      </Button>
    </View>
  )
}
