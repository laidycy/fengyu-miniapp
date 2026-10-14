// 对齐线上 V0.0.5
import { useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

// 12条安全须知（对齐 BookingPage SAFETY_RULES；本页序号由圆点 safety-item-num 显示，故文本不带数字前缀）
const SAFETY_RULES = [
  '本垂钓基地为户外水域场所，请认真阅读并遵守本安全须知。',
  '未成年人、不会游泳者、酒后及身体不适者禁止下水，禁止靠近深水区。',
  '垂钓全程请穿戴安全装备，遵守现场工作人员指引，服从安全管理。',
  '严禁在雷雨、大风等恶劣天气下垂钓；遇突发天气请立即撤离至安全区域。',
  '爱护环境卫生，勿乱丢垃圾；鱼获按基地规定处理，禁止电鱼、毒鱼等违法捕捞。',
  '垂钓及往返途中的人身、财产安全由本人负责，请自行购买相应保险。',
  '请在指定区域内垂钓，进入基地即视为同意本须知全部条款。',
  '垂钓属高风险户外水域活动，存在溺水、滑倒、鱼钩划伤、天气突变等固有风险。您系在知晓并自愿参加、风险自担的前提下参与活动；进入场地即视为您对自身安全及行为负完全责任，自愿承担参与垂钓活动可能产生的一切人身及财产风险。',
  '请自行妥善保管车辆、渔具、手机、现金等随身及车内财物，遗失、损坏或被盗，本公司不承担保管及赔偿责任。',
  '未成年人、无完全民事行为能力人入场须由具备监护能力的成年人全程陪同并负责其安全；陪同人须对被陪同人行为承担全部责任。',
  '如您患有心脑血管疾病、癫痫、高血压等不宜垂钓或剧烈活动的疾病，请勿入场或在医生指导下量力而行；如遇身体不适或突发状况，请第一时间联系现场工作人员协助，紧急情况请拨打120。',
  '场内垂钓按预约公示价格收费，凭小程序订单入场核销。您在本平台支付的费用中，目前仅会员费及农副产品类消费可开具电子发票，需开发票请凭支付记录线下联系客服办理（电话13800000000）。本须知与《用户服务协议》共同构成您与本公司之间的约定。'
]

export default function SafetyNoticePage() {
  const [agreed, setAgreed] = useState(false)
  // 用系统真实可视高度（已扣掉原生导航栏），避免 100vh 超出导致底部被裁切
  const windowHeight = Taro.getSystemInfoSync().windowHeight

  // 返回上一页
  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/HomePage/index' })
    }
  }

  // 勾选后才可同意
  const handleAgree = () => {
    if (!agreed) {
      Taro.showToast({ title: '请先勾选我已阅读并同意', icon: 'none' })
      return
    }
    handleBack()
  }

  return (
    // style 高度用真实可视高度(px)，保证一屏完整展示、确认栏不被裁切
    <View className='safety-page' style={{ height: `${windowHeight}px` }}>
      {/* 顶部横幅 */}
      <View className='safety-banner'>
        <View className='safety-banner-top'>
          <Text className='safety-back-arrow' onClick={handleBack}>‹</Text>
          <Text className='safety-banner-title'>安全须知</Text>
          <View className='safety-banner-top-placeholder' />
        </View>
        <Text className='safety-banner-icon'>🛡️</Text>
        <Text className='safety-banner-sub'>请仔细阅读并遵守以下安全规定</Text>
      </View>

      {/* 规则列表（一屏滚动展示） */}
      <ScrollView className='safety-list' scrollY>
        {SAFETY_RULES.map((rule, idx) => (
          <View key={idx} className='safety-item'>
            <View className='safety-item-num'>{idx + 1}</View>
            <Text className='safety-item-text'>{rule}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 勾选 + 同意 */}
      <View className='safety-confirm'>
        <View className='safety-check-row' onClick={() => setAgreed(!agreed)}>
          <View className={`safety-checkbox ${agreed ? 'safety-checkbox-on' : ''}`}>
            {agreed && <Text className='safety-checkbox-mark'>✓</Text>}
          </View>
          <Text className='safety-check-text'>我已阅读并同意《安全须知》全部条款</Text>
        </View>
        <Button
          className={`safety-btn ${agreed ? '' : 'safety-btn-disabled'}`}
          onClick={handleAgree}
        >
          同意并返回
        </Button>
        <Text className='safety-tip'>丰鱼天下祝您渔获满满！</Text>
      </View>
    </View>
  )
}
