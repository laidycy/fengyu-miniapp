// 对齐线上 V0.0.5
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { RESERVOIR_LOCATION, NAVIGATION_STEPS, RESERVOIR_INTRO } from '../../utils/config'
import './index.scss'

export default function NavigationPage() {
  // 打开地图导航（腾讯/微信内置地图）
  const handleOpenLocation = () => {
    Taro.openLocation({
      latitude: RESERVOIR_LOCATION.latitude,
      longitude: RESERVOIR_LOCATION.longitude,
      name: RESERVOIR_LOCATION.name,
      address: RESERVOIR_LOCATION.address,
      scale: 16
    })
  }

  // 选择地图（腾讯地图 route）
  const handleOpenTencentMap = () => {
    Taro.openLocation({
      latitude: RESERVOIR_LOCATION.latitude,
      longitude: RESERVOIR_LOCATION.longitude,
      name: RESERVOIR_LOCATION.name,
      address: RESERVOIR_LOCATION.address,
      scale: 16
    })
  }

  return (
    <View className='page navigation-page'>
      {/* 水库信息卡片 */}
      <View className='reservoir-card'>
        <Text className='reservoir-name'>💧 {RESERVOIR_LOCATION.name}</Text>
        <Text className='reservoir-address'>📍 {RESERVOIR_LOCATION.address}</Text>
        <View className='reservoir-tags'>
          <Text className='reservoir-tag'>天然森林氧吧</Text>
          <Text className='reservoir-tag'>Ⅰ类水质</Text>
          <Text className='reservoir-tag'>生态保护区</Text>
        </View>
        <Text className='reservoir-desc'>{RESERVOIR_INTRO}</Text>
      </View>

      {/* 导航按钮 */}
      <View className='nav-actions'>
        <Button className='nav-btn' onClick={handleOpenLocation}>
          🧭 打开地图导航
        </Button>
        <Button className='nav-btn nav-btn-secondary' onClick={handleOpenTencentMap}>
          📍 选择地图导航
        </Button>
      </View>

      {/* 自驾路线说明 */}
      <View className='section'>
        <Text className='section-title'>🚗 自驾路线说明</Text>
        <View className='route-list'>
          {NAVIGATION_STEPS.map(step => (
            <View key={step.step} className='route-item'>
              <View className='route-step'>{step.step}</View>
              <View className='route-body'>
                <Text className='route-text'>{step.text}</Text>
                {step.distance ? (
                  <Text className='route-distance'>{step.distance}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='notice-wrap'>
        <Text className='notice-text'>⚠️ 山路弯多，请谨慎驾驶，注意安全</Text>
      </View>
    </View>
  )
}
