// 对齐线上 V0.0.5 管理端
import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getAdminAnnouncements, deleteAdminAnnouncement, isAdminLoggedIn } from '../../utils/api/admin'
import { showToast } from '../../utils/index'
import './index.scss'

export default function AdminAnnouncePage() {
  const [auth, setAuth] = useState(false)
  const [list, setList] = useState<any[]>([])

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      showToast('请先登录管理员账号')
      Taro.reLaunch({ url: '/pages/AdminDashPage/index' })
      return
    }
    setAuth(true)
    loadList()
  }, [])

  const loadList = async () => {
    try {
      const data = await getAdminAnnouncements()
      setList(data && Array.isArray(data) ? data : [])
    } catch {
      setList([])
    }
  }

  const goAdd = () => {
    Taro.navigateTo({ url: '/pages/AdminAnnounceFormPage/index' })
  }

  const goEdit = (item: any) => {
    Taro.navigateTo({ url: `/pages/AdminAnnounceFormPage/index?id=${item.id}` })
  }

  const handleDelete = (item: any) => {
    Taro.showModal({
      title: '删除公告',
      content: `确定删除「${item.title}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteAdminAnnouncement(item.id)
            showToast('删除成功', 'success')
            setList(list.filter((x) => x.id !== item.id))
          } catch (e: any) {
            showToast(e.message || '删除失败')
          }
        }
      }
    })
  }

  if (!auth) return <View className='page admin-announce-page' />

  return (
    <View className='page admin-announce-page'>
      <View className='top-bar'>
        <Text className='top-title'>公告列表</Text>
        <Button className='add-btn' onClick={goAdd}>+ 新增</Button>
      </View>

      {list.length === 0 ? (
        <View className='empty'>暂无公告，点击右上角新增</View>
      ) : (
        <View className='list'>
          {list.map((item) => (
            <View key={item.id} className='item'>
              <View className='item-main' onClick={() => goEdit(item)}>
                <View className='item-title-row'>
                  <Text className='item-title'>{item.title}</Text>
                  <Text className={`item-status ${item.status}`}>
                    {item.status === 'published' ? '已发布' : '草稿'}
                  </Text>
                </View>
                {item.subtitle ? <Text className='item-sub'>{item.subtitle}</Text> : null}
                <Text className='item-tags'>
                  {(Array.isArray(item.tags) ? item.tags : []).join(' · ') || '无标签'}
                </Text>
              </View>
              <View className='item-actions'>
                <Button className='act-btn edit' onClick={() => goEdit(item)}>编辑</Button>
                <Button className='act-btn delete' onClick={() => handleDelete(item)}>删除</Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
