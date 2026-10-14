// 钓友排行 · 对接真实后端 /api/members/ranking（snake_case）
import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getRanking } from '../../utils/api/members'
import { showToast } from '../../utils/index'
import type { RankingItem } from '../../utils/types'
import './index.scss'

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_COLOR = ['#FFD700', '#B0BEC5', '#CD853F']

type RankType = 'yearly' | 'single'

const TAB_LIST: { key: RankType; label: string; icon: string }[] = [
  { key: 'yearly', label: '年度总渔获', icon: '🏆' },
  { key: 'single', label: '单尾最大', icon: '🐟' }
]

function currentYear(): number {
  return new Date().getFullYear()
}

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState<RankType>('yearly')
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRanking(activeTab)
  }, [activeTab])

  const loadRanking = async (type: RankType) => {
    setLoading(true)
    try {
      const data = await getRanking(type)
      setRanking(data || [])
    } catch {
      setRanking([])
      showToast('排行榜加载失败', 'none')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (type: RankType) => {
    if (type === activeTab) return
    setActiveTab(type)
  }

  const year = currentYear()
  const titleText = activeTab === 'single' ? `${year} 单尾重量榜` : `${year} 年度总渔获榜`

  // 前三名领奖台（榜单首位靠边）
  const top1 = ranking[0]
  const top2 = ranking[1]
  const top3 = ranking[2]
  const rest = ranking.slice(3)

  const podiumOrder = [top2, top1, top3].filter(Boolean)

  return (
    <View className='page ranking-page'>
      {/* 头部横幅 */}
      <View className='ranking-hero'>
        <Text className='ranking-hero-title'>🎣 钓友风云榜</Text>
        <Text className='ranking-hero-sub'>{year} · 数据实时更新</Text>
      </View>

      {/* tab 切换 */}
      <View className='ranking-tabs'>
        {TAB_LIST.map(tab => (
          <View
            key={tab.key}
            className={`ranking-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <Text className='ranking-tab-icon'>{tab.icon}</Text>
            <Text className='ranking-tab-text'>{tab.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View className='ranking-loading'><Text>加载中...</Text></View>
      ) : (
        <>
          {/* 前三名领奖台 */}
          {ranking.length >= 1 && (
            <View className='podium'>
              <View className='podium-body'>
                {podiumOrder.map(it => {
                  const isFirst = it.rank === 1
                  return (
                    <View key={it.user_id} className={`podium-item ${isFirst ? 'first' : it.rank === 2 ? 'second' : 'third'}`}>
                      <Text className='podium-medal'>
                        {isFirst ? '👑' : it.rank === 2 ? '🥈' : '🥉'}
                      </Text>
                      <View className='podium-avatar-wrap'>
                        {it.avatar ? (
                          <Image className='podium-avatar' src={it.avatar} mode='aspectFill' />
                        ) : (
                          <View className='podium-avatar-default'>🐟</View>
                        )}
                      </View>
                      <Text className='podium-name'>{it.user_name || '匿名钓友'}</Text>
                      <View className={`podium-block ${isFirst ? 'block-1' : it.rank === 2 ? 'block-2' : 'block-3'}`}>
                        <View className='podium-block-weight'>
                          <Text className='block-weight'>{formatWeight(it, activeTab)}</Text>
                          <Text className='block-unit'>
                            {activeTab === 'single' ? '单尾最大' : '总渔获'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* 完整榜单 */}
          <View className='rank-head'>
            <Text className='rank-head-title'>📋 完整榜单</Text>
            <Text className='rank-head-hint'>前 {ranking.length} 名钓友</Text>
          </View>
          <View className='ranking-list'>
            {ranking.length === 0 ? (
              <View className='ranking-empty'>
                <Text className='ranking-empty-icon'>🎣</Text>
                <Text className='ranking-empty-text'>暂无排行数据</Text>
              </View>
            ) : (
              ranking.map(item => {
                const isPodium = item.rank <= 3
                return (
                  <View key={item.user_id} className={`rank-item ${isPodium ? 'top' : ''}`}>
                    <View className='rank-num-wrap'>
                      {isPodium ? (
                        <Text className='rank-num-medal'>{MEDAL[item.rank - 1]}</Text>
                      ) : (
                        <Text className='rank-num'>{item.rank}</Text>
                      )}
                    </View>
                    {item.avatar ? (
                      <Image className='rank-avatar' src={item.avatar} mode='aspectFill' />
                    ) : (
                      <View className='rank-avatar rank-avatar-default'>🐟</View>
                    )}
                    <View className='rank-info'>
                      <Text className='rank-name'>{item.user_name || '匿名钓友'}</Text>
                      <Text className='rank-detail'>
                        {item.catch_count} 次渔获 · {singleBiggestText(item)}
                      </Text>
                    </View>
                    <View className='rank-right'>
                      <Text className={`rank-weight ${isPodium ? 'top' : ''}`}>
                        {formatWeight(item, activeTab)}
                      </Text>
                      <Text className='rank-unit'>
                        {activeTab === 'single' ? '最大单尾' : '总渔获'}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {!loading && ranking.length > 0 && (
            <View className='ranking-footer' onClick={() => Taro.navigateTo({ url: '/pages/NavigationPage/index' })}>
              <Text className='ranking-footer-text'>📍 想挑战榜首？点击前往水库导航</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

function singleBiggestText(item: RankingItem): string {
  if (item.biggest_fish == null || item.biggest_fish === '') return '暂无单尾数据'
  return `单尾最大 ${Number(item.biggest_fish).toFixed(1)}斤`
}

// 格式化重量（斤）：单尾榜显示单条最大，年度榜显示累计总渔获
function formatWeight(item: RankingItem, type: RankType = 'yearly'): string {
  const raw = type === 'single' ? item.biggest_fish : item.total_weight
  const n = Number(raw || 0)
  return `${n.toFixed(1)}`
}
