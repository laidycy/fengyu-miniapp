// 用户服务协议页
import { View, Text } from '@tarojs/components'
import './index.scss'

export default function UserAgreementPage() {
  return (
    <View className='page agreement-page'>
      <View className='content-card'>
        <Text className='policy-title'>丰鱼天下用户服务协议</Text>
        <Text className='policy-date'>更新日期：2026年9月7日</Text>

        <View className='section'>
          <Text className='section-title'>一、协议的接受</Text>
          <Text className='text'>
            欢迎您使用丰鱼天下小程序（以下简称"本服务"）。在使用本服务前，请您仔细阅读并充分理解本协议的全部内容。当您开始使用本服务，即视为您已阅读、理解并同意接受本协议的各项条款。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>二、服务内容</Text>
          <Text className='text'>本服务向您提供以下功能：</Text>
          <Text className='text'>1. 水库垂钓预约：在线选择日期、时段和人数进行预约；</Text>
          <Text className='text'>2. 会员服务：开通银卡、金卡、钻石卡会员，享受对应权益；</Text>
          <Text className='text'>3. 渔获记录：记录您的渔获信息，累计积分；</Text>
          <Text className='text'>4. 积分商城：使用积分兑换相关产品和服务；</Text>
          <Text className='text'>5. 导航服务：为您提供前往水库的路线导航。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>三、用户账号</Text>
          <Text className='text'>
            1. 您需通过微信授权登录并使用本服务。您应确保提供的个人信息真实、准确、完整。
          </Text>
          <Text className='text'>
            2. 您的账号仅限本人使用，不得出借、转让或出售。因您保管不善导致账号被盗用所造成的损失，由您自行承担。
          </Text>
          <Text className='text'>
            3. 如发现任何未经授权使用您账号的情况，请立即通知我们。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>四、用户行为规范</Text>
          <Text className='text'>您在使用本服务时，应遵守法律法规，不得从事以下行为：</Text>
          <Text className='text'>1. 发布虚假、违法、侵权信息；</Text>
          <Text className='text'>2. 利用本服务从事欺诈、非法经营活动；</Text>
          <Text className='text'>3. 干扰、破坏本服务的正常运行；</Text>
          <Text className='text'>4. 其他违反法律法规或损害他人合法权益的行为。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>五、预约与支付</Text>
          <Text className='text'>
            1. 提交预约订单即表示您同意预约规则和收费标准，我们将为您保留预约时段。
          </Text>
          <Text className='text'>
            2. 预约成功后如需取消，请根据预约规则在规定时间内操作。逾期未到场的预约，系统将自动为您办理退款。
          </Text>
          <Text className='text'>
            3. 支付通过微信支付完成。支付成功后即视为预约生效，具体退改规则以预约页面提示为准。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>六、会员服务</Text>
          <Text className='text'>
            1. 会员分为银卡、金卡、钻石卡三个等级，具体价格与权益以会员页面展示为准。
          </Text>
          <Text className='text'>
            2. 会员有效期以开通时显示的到期日期为准，到期后需续费方可继续享受会员权益。
          </Text>
          <Text className='text'>
            3. 会员权益的最终解释权归丰城隆龙农业发展有限公司所有。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>七、服务变更与终止</Text>
          <Text className='text'>
            我们可能根据业务发展需要对服务内容进行调整、升级或变更。如因不可抗力、法律法规调整等原因导致本服务无法继续提供，我们将在合理范围内提前通知您。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>八、免责声明</Text>
          <Text className='text'>
            1. 垂钓活动存在一定的安全风险，请您在参与活动时注意人身安全，遵守水库安全规定。
          </Text>
          <Text className='text'>
            2. 因不可抗力（如自然灾害、政府行为等）导致服务中断或无法履约的，我们不承担相应责任，但将尽力协调处理。
          </Text>
          <Text className='text'>
            3. 垂钓属于具有固有风险的高风险户外水域活动。您在预约并参与垂钓活动前，应充分了解并自愿参加、风险自担，自愿承担垂钓过程中可能发生的溺水、滑倒、摔伤、鱼钩刺伤、突发天气及其他不可预见的风险。您自愿参加活动即视为同意风险自担，本公司不对因您自身原因（包括但不限于违反安全须知、不听从现场工作人员指引、隐瞒不适宜垂钓的疾病等）导致的人身伤害承担责任，但本公司将尽合理救助义务。
          </Text>
          <Text className='text'>
            4. 本公司不对您在本场地内或往返途中遗失、损坏、被盗的个人财物（含车辆、渔具、随身物品）承担保管或赔偿责任。
          </Text>
          <Text className='text'>
            5. 因第三方行为、恶劣天气、自然灾害、政府行为、网络或支付通道故障等本公司无法控制的原因导致的服务中断、延迟或无法履约，本公司不承担违约责任，但将尽力协调处理或将情况及时告知。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>九、费用、退款与发票</Text>
          <Text className='text'>
            1. 垂钓费、会员费等各项收费均以预约/下单页面实时公示的价格为准，支付即代表您确认接受相应收费标准。
          </Text>
          <Text className='text'>
            2. 预约类订单逾期未到场的，系统将自动为您办理退款；已开通会员、已兑换权益等一经开通/兑换成功即视为已消费，原则上不予退款。
          </Text>
          <Text className='text'>
            3. 您在本平台支付的费用中，目前仅会员费及农副产品类消费可开具发票，发票类型为增值税普通发票（电子）。开票请线下联系客服（电话13800000000）并提供支付凭证及开票抬头信息办理，发票税金由本公司承担，不向您额外收取。发票据实开具，不因会员折扣、优惠券、兑换等优惠而多开。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>十、责任限制</Text>
          <Text className='text'>
            在法律允许的最大范围内，本公司对您因使用本服务而产生的间接损失、衍生损失（包括但不限于预期利益损失）不承担责任；本公司对您的累计赔偿责任，以您就相关服务实际支付给本公司的费用总额为上限。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>十一、联系我们</Text>
          <Text className='text'>
            如您对本协议有任何疑问或建议，可通过以下方式联系我们：{'\n'}
            客服电话：13800000000{'\n'}
            客服微信：丰鱼天下
          </Text>
        </View>
      </View>
    </View>
  )
}
