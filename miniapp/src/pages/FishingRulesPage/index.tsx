// 丰鱼天下钓鱼制度 —— 整理自《丰鱼天下钓鱼制度.doc》(2026年6月版)
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

// 区块标题组件（内部）
function Section({ icon, title, children }: { icon: string; title: string; children: any }) {
  return (
    <View className='fr-section'>
      <View className='fr-section-title'>
        <Text className='fr-section-icon'>{icon}</Text>
        <Text className='fr-section-text'>{title}</Text>
      </View>
      <View className='fr-section-body'>{children}</View>
    </View>
  )
}

// 条款行
function Line({ num, children }: { num?: string; children: any }) {
  return (
    <View className='fr-line'>
      {num ? <Text className='fr-line-num'>{num}</Text> : null}
      <Text className='fr-line-text'>{children}</Text>
    </View>
  )
}

export default function FishingRulesPage() {
  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/HomePage/index' })
    }
  }

  return (
    <View className='page fr-page'>
      {/* 顶部横幅 */}
      <View className='fr-banner'>
        <Text className='fr-banner-icon'>🎣</Text>
        <Text className='fr-banner-title'>丰鱼天下钓鱼制度</Text>
        <Text className='fr-banner-sub'>确保鱼的品质 · 公布标准鱼价 · 定额钓鱼数量</Text>
      </View>

      {/* 会员制度一览表 */}
      <View className='fr-section'>
        <View className='fr-section-title'>
          <Text className='fr-section-icon'>📊</Text>
          <Text className='fr-section-text'>会员制度一览表</Text>
        </View>
        <View className='fr-table'>
          <View className='fr-table-row fr-table-head'>
            <Text className='fr-th'>会员等级</Text>
            <Text className='fr-th'>入会费(元)</Text>
            <Text className='fr-th'>钓鱼定额(斤/年)</Text>
            <Text className='fr-th'>定额外优惠价(元/斤)</Text>
          </View>
          <View className='fr-table-row'>
            <Text className='fr-td'>散客</Text>
            <Text className='fr-td'>按时间计<br/>400元/天</Text>
            <Text className='fr-td'>—</Text>
            <Text className='fr-td'>标准鱼价16</Text>
          </View>
          <View className='fr-table-row'>
            <Text className='fr-td'>银卡</Text>
            <Text className='fr-td'>首年888<br/>续年888</Text>
            <Text className='fr-td'>68</Text>
            <Text className='fr-td'>14.80</Text>
          </View>
          <View className='fr-table-row'>
            <Text className='fr-td'>金卡</Text>
            <Text className='fr-td'>首年4888<br/>续年免年费</Text>
            <Text className='fr-td'>首年78<br/>续年取消限制</Text>
            <Text className='fr-td'>14.80</Text>
          </View>
          <View className='fr-table-row'>
            <Text className='fr-td'>钻石卡</Text>
            <Text className='fr-td'>首年8888<br/>续年免年费</Text>
            <Text className='fr-td'>首年88<br/>续年取消限制</Text>
            <Text className='fr-td'>14.80</Text>
          </View>
        </View>
        <Text className='fr-note'>散客按标准鱼价16元/斤；其余等级定额外统一按14.80元/斤优惠价计算。</Text>
      </View>

      <Section icon='🏞️' title='钓鱼水域'>
        <Line num='1.'>计划于 2026年1月1日 首先开放【前山水库】钓鱼，其余水库陆续开放，连锁经营，会员可自由选择。</Line>
        <Line num='2.'>前山水库位于丰城市秀市镇前山村，全流域均为无人区、生态保护区，Ⅰ类水质，天然森林氧吧。</Line>
        <Line num='3.'>水域分布：钱澄湖野钓区（存鱼12万斤以上）、龙呤池休闲钓（存鱼3万斤以上）、巨龙钓（存鱼1万斤以上，其中10斤以上大鱼108条）、120m圆形竞技池1处、国家级比赛标准池4处（比赛用鱼需提前十天预约）。枯水期存鱼减半。</Line>
        <Line num='4.'>鱼质保证：鱼均为人放天养（仅库区及水面农田牧草例外）；成品鱼投入野钓区前需在水库屯鱼区野化30天以上；丰鱼天下出售的鱼需野化45天以上。</Line>
      </Section>

      <Section icon='🐟' title='标准鱼价'>
        <Line num='1.'>2026年标准鱼价【16元/斤】（以鲫鱼价格为标准）。</Line>
        <Line num='2.'>回收鱼按【5元/斤】计算。</Line>
        <Line num='3.'>钓上的鱼不分鱼种，均按标准鱼价计算。</Line>
        <Line num='4.'>散客执行2026年标准鱼价。</Line>
      </Section>

      <Section icon='🎁' title='福利鱼规则'>
        <Line num='1.'>福利鱼仅限以下鱼种：<Text className='fr-highlight'>胖头鱼、草鱼、鲫鱼、鲤鱼、鳊鱼</Text>。</Line>
        <Line num='2.'>会员购买其它名贵鱼种，需计算差价。</Line>
        <Line num='3.'>定额内的鱼按优惠价，超过部分按定额外优惠价（14.80元/斤）计算。</Line>
        <Line num='4.'>定额不足部分，可在第二年春节前到水库或公司指定地点补足（仅限福利鱼），过期作废，不能累计到第二年。</Line>
      </Section>

      <Section icon='👤' title='加入条件'>
        <Line num='1.'>须提供身份证、手机号码、工作单位、是否会游泳等个人基本信息。</Line>
        <Line num='2.'>须说明介绍人。</Line>
        <Line num='3.'>进入水库须穿统一的救生衣才能开始钓鱼。</Line>
        <Line num='4.'>通过微信与丰鱼天下公众号进行业务登记。</Line>
      </Section>

      <Section icon='💳' title='会员等级与费用'>
        <Line num='1.'><Text className='fr-strong'>银卡会员</Text>：入会费即首年年费888元，至2050年12月31日有效，可继承或转让；今后年费888元。可钓68斤鱼/年，超过部分按定额外优惠价计算。</Line>
        <Line num='2.'><Text className='fr-strong'>金卡会员</Text>：入会费4888元，至2050年12月31日有效，可继承或转让；首年可钓78斤鱼，今后无须交纳年费。每年可进入巨龙钓1次。</Line>
        <Line num='3.'><Text className='fr-strong'>钻石卡会员</Text>：入会费8888元，至2050年12月31日有效，可继承或转让；首年可钓88斤鱼，今后无须交纳年费。每季可进入巨龙钓1次。</Line>
      </Section>

      <Section icon='🛍️' title='会员福利'>
        <Line num='1.'>会员直接到水库买鱼按市场价80%优惠；在公司指定其它专卖点按85%优惠（送货上门另行说明）。</Line>
        <Line num='2.'>钻石卡会员每次可享受一条最大鱼用活鱼包装等。</Line>
        <Line num='3.'>农副产品价格每年在微信公众号公布；在共享菜园采摘蔬果、采购鱼丸鱼冻等，散客按公众价格，会员可用积分抵扣。</Line>
      </Section>

      <Section icon='⭐' title='会员积分规则'>
        <Line num='1.'>积分按鱼获重量计算：<Text className='fr-highlight'>每斤鱼计 1 分</Text>。</Line>
        <Line num='2.'>入会赠送积分：银卡<b>68分</b>、金卡<b>380分</b>、钻石卡<b>680分</b>；升级的会员按升级前后高分计算（只补差、不重复赠送）。</Line>
        <Line num='3.'>积分可抵扣农副产品：<Text className='fr-highlight'>1分 = 1元</Text>（仅限农副产品，不用于钓鱼）。</Line>
        <Line num='4.'>积分获取后满 <Text className='fr-highlight'>1年</Text> 方可使用（即锁定积分，到期自动转为可用）。</Line>
      </Section>

      <Section icon='⬆️' title='会员升级规则'>
        <Line num='1.'>银卡介绍5人成为银卡会员（不含自己）→ 升级金卡。</Line>
        <Line num='2.'>银卡介绍9人成为银卡会员（不含自己）→ 升级钻石卡。</Line>
        <Line num='3.'>金卡介绍4人成为银卡会员 → 升级钻石卡。</Line>
        <Line num='4.'>银卡连续5年 → 自动升级金卡；金卡5年后 → 自动升级钻石卡。</Line>
      </Section>

      <View className='fr-footer'>
        <Text className='fr-footer-text'>解释权归丰城隆龙农业发展有限公司</Text>
        <Text className='fr-footer-date'>2026年6月</Text>
      </View>

      <View className='fr-back' onClick={handleBack}>
        <Text className='fr-back-text'>返回</Text>
      </View>
    </View>
  )
}
