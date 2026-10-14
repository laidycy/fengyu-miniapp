// 对齐线上 V0.0.5
import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getAnnouncementDetail } from '../../utils/api/announcements'
import { formatDate, showToast } from '../../utils/index'
import type { Announcement } from '../../utils/types'
import './index.scss'

export default function AnnounceDetailPage() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    const id = params?.id
    if (id) {
      loadDetail(id)
    } else {
      setLoading(false)
      showToast('参数有误', 'none')
    }
  }, [])

  const loadDetail = async (id: string | number) => {
    setLoading(true)
    try {
      const data = await getAnnouncementDetail(id)
      setAnnouncement(data)
    } catch {
      setAnnouncement(null)
      showToast('公告加载失败', 'none')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='page announce-detail-page'>
      {loading ? (
        <View className='announce-loading'><Text>加载中...</Text></View>
      ) : announcement ? (
        <View className='detail-card'>
          {/* 标题区 */}
          <View className='detail-header'>
            <View className='detail-title-row'>
              {announcement.tags && announcement.tags.length > 0 && (
                <View className='detail-tags'>
                  {announcement.tags.map((tag, i) => (
                    <Text key={i} className='detail-tag' style={{ color: announcement.color || '#2E7D32' }}>
                      {tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <Text className='detail-title'>{announcement.title}</Text>
            {announcement.subtitle ? (
              <Text className='detail-subtitle'>{announcement.subtitle}</Text>
            ) : null}
            <Text className='detail-date'>
              发布时间：{formatDate(announcement.publish_time, 'YYYY-MM-DD HH:mm')}
            </Text>
          </View>

          <View className='detail-divider' />

          {/* 正文（detail 为对象：intro/highlights/time/location/contact） */}
          <View className='detail-content'>
            {announcement.detail && typeof announcement.detail === 'object' ? (
              <>
                {announcement.detail.image ? (
                  <Image className='detail-banner-img' src={announcement.detail.image} mode='widthFix' />
                ) : null}

                {announcement.detail.intro ? (
                  <Text className='detail-text' userSelect>{announcement.detail.intro}</Text>
                ) : null}

                {announcement.detail.highlights && announcement.detail.highlights.length > 0 ? (
                  <View className='detail-highlights'>
                    {announcement.detail.highlights.map((h, i) => (
                      <View key={i} className='detail-highlight-item'>
                        <Text className='detail-highlight-dot'>✓</Text>
                        <Text className='detail-highlight-text'>{h}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {announcement.detail.time ? (
                  <View className='detail-info-row'>
                    <Text className='detail-info-label'>🕐 时间</Text>
                    <Text className='detail-info-value'>{announcement.detail.time}</Text>
                  </View>
                ) : null}

                {announcement.detail.location ? (
                  <View className='detail-info-row'>
                    <Text className='detail-info-label'>📍 地点</Text>
                    <Text className='detail-info-value'>{announcement.detail.location}</Text>
                  </View>
                ) : null}

                {announcement.detail.contact ? (
                  <View className='detail-info-row'>
                    <Text className='detail-info-label'>📞 联系</Text>
                    <Text
                      className='detail-info-value detail-info-contact'
                      onClick={() => Taro.makePhoneCall({ phoneNumber: announcement.detail!.contact! })}
                    >
                      {announcement.detail.contact}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text className='detail-text'>暂无内容</Text>
            )}
          </View>
        </View>
      ) : (
        <View className='announce-empty'>
          <Text className='announce-empty-icon'>📢</Text>
          <Text className='announce-empty-text'>公告不存在或已下线</Text>
        </View>
      )}
    </View>
  )
}
