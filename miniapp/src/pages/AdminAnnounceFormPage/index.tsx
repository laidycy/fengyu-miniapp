// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getAdminAnnouncementDetail, createAdminAnnouncement, updateAdminAnnouncement, isAdminLoggedIn
} from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import './index.scss'

const STATUS_OPTS = ['published', 'draft']
const STATUS_LABELS = ['已发布', '草稿']
const COLORS = ['#2E7D32', '#1976D2', '#F9A825', '#E53935', '#8E24AA', '#00ACC1']

export default function AdminAnnounceFormPage() {
  const [auth, setAuth] = useState(false)
  const id = Taro.getCurrentInstance().router?.params?.id
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState('draft')
  const [statusIndex, setStatusIndex] = useState(1)
  const [sortOrder, setSortOrder] = useState('0')
  const [detail, setDetail] = useState('')
  // 编辑时记住原始 detail 对象，保存时保留其它子字段（highlights/time/location/contact/image 等）
  const [rawDetail, setRawDetail] = useState<any>(null)

  const isEdit = !!id

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      showToast('请先登录管理员账号')
      Taro.reLaunch({ url: '/pages/AdminDashPage/index' })
      return
    }
    setAuth(true)
    loadDetail()
  }, [])

  const loadDetail = async () => {
    if (!id) return
    try {
      const data = await getAdminAnnouncementDetail(id)
      if (data) {
        setTitle(data.title || '')
        setSubtitle(data.subtitle || '')
        if (data.color && COLORS.indexOf(data.color) > -1) setColor(data.color)
        else if (data.color) setColor(data.color)
        setTags(Array.isArray(data.tags) ? data.tags.join(',') : String(data.tags || ''))
        const st = data.status === 'published' ? 'published' : 'draft'
        setStatus(st)
        setStatusIndex(st === 'published' ? 0 : 1)
        setSortOrder(String(data.sort_order ?? 0))
        // detail 兼容对象与字符串
        const d = data.detail
        if (d && typeof d === 'object') {
          setRawDetail(d)
          setDetail(d.intro || d.content || '')
        } else {
          setRawDetail(null)
          if (typeof d === 'string') {
            setDetail(d)
          } else if (data.content) {
            setDetail(data.content)
          }
        }
      }
    } catch (e: any) {
      showToast(e.message || '加载失败')
    }
  }

  const handleSubmit = async () => {
    if (!title) {
      showToast('请输入公告标题')
      return
    }
    // 编辑时保留原始 detail 的其它子字段，仅更新正文（intro/content）
    const detailObj =
      rawDetail && typeof rawDetail === 'object'
        ? { ...rawDetail, intro: detail, content: detail }
        : { intro: detail, content: detail }
    const payload: any = {
      title,
      subtitle: subtitle || undefined,
      color,
      tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      status,
      sort_order: Number(sortOrder) || 0,
      detail: detailObj
    }
    try {
      if (isEdit) {
        await updateAdminAnnouncement(id, payload)
      } else {
        await createAdminAnnouncement(payload)
      }
      showToast('保存成功', 'success')
      setTimeout(() => Taro.navigateBack(), 800)
    } catch (e: any) {
      showToast(e.message || '保存失败')
    }
  }

  if (!auth) return <View className='page admin-announce-form-page' />

  return (
    <View className='page admin-announce-form-page'>
      <View className='card'>
        <Text className='card-title'>{isEdit ? '✏️ 编辑公告' : '➕ 新增公告'}</Text>

        <View className='form-row'>
          <Text className='form-label'>标题*</Text>
          <Input className='form-input' value={title} placeholder='公告标题' onInput={(e) => setTitle(e.detail.value)} />
        </View>
        <View className='form-row'>
          <Text className='form-label'>副标题</Text>
          <Input className='form-input' value={subtitle} placeholder='选填' onInput={(e) => setSubtitle(e.detail.value)} />
        </View>
        <View className='form-row'>
          <Text className='form-label'>颜色</Text>
          <View className='color-row'>
            {COLORS.map((c) => (
              <View
                key={c}
                className={`color-dot ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </View>
        </View>
        <View className='form-row'>
          <Text className='form-label'>标签</Text>
          <Input className='form-input' value={tags} placeholder='多个标签用逗号分隔' onInput={(e) => setTags(e.detail.value)} />
        </View>
        <View className='form-row'>
          <Text className='form-label'>状态</Text>
          <Picker
            mode='selector'
            range={STATUS_LABELS}
            value={statusIndex}
            onChange={(e) => { const i = Number(e.detail.value); setStatusIndex(i); setStatus(STATUS_OPTS[i]) }}
          >
            <View className='picker-value'>{STATUS_LABELS[statusIndex]}</View>
          </Picker>
        </View>
        <View className='form-row'>
          <Text className='form-label'>排序</Text>
          <Input className='form-input' value={sortOrder} type='number' placeholder='数字，越小越靠前' onInput={(e) => setSortOrder(e.detail.value)} />
        </View>
        <View className='form-block'>
          <Text className='form-label'>内容详情</Text>
          <Textarea
            className='detail-textarea'
            value={detail}
            placeholder='请输入公告正文内容'
            onInput={(e) => setDetail(e.detail.value)}
            maxlength={5000}
          />
        </View>

        <Button className='submit-btn' onClick={handleSubmit}>保存公告</Button>
      </View>
    </View>
  )
}
