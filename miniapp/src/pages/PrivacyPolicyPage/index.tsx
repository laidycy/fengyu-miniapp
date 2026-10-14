// 丰鱼天下隐私政策 —— 按微信官方规范完善
import { View, Text } from '@tarojs/components'
import './index.scss'

export default function PrivacyPolicyPage() {
  return (
    <View className='page privacy-page'>
      <View className='content-card'>

        <Text className='policy-title'>丰鱼天下隐私政策</Text>
        <Text className='policy-date'>更新日期：2026年9月1日</Text>
        <Text className='policy-intro'>
          欢迎您使用丰鱼天下小程序（以下简称"本服务"）。我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们承诺将按法律法规及业界成熟的安全标准，采取相应的安全保护措施来保护您的个人信息。
        </Text>
        <Text className='policy-intro'>
          请您在使用本服务前，仔细阅读并充分理解本隐私政策。本政策将帮助您了解我们如何收集、使用、存储、共享和保护您的个人信息，以及您享有的相关权利。如您对本政策有任何疑问，可通过文末联系方式与我们联系。
        </Text>

        <View className='section'>
          <Text className='section-title'>一、我们收集的信息</Text>
          <Text className='text'>在您使用本服务的过程中，我们可能会收集以下类别的信息：</Text>

          <Text className='text sub-title'>1. 您主动提供的信息</Text>
          <Text className='text'>（1）微信昵称与头像：当您通过微信登录时，我们会获取您在微信中设置的昵称和头像，用于在平台内展示您的身份；</Text>
          <Text className='text'>（2）手机号码：当您使用手机号快捷登录或主动绑定手机号时，我们会收集您的手机号码，用于账号识别、预约通知与安全保障；</Text>
          <Text className='text'>（3）您填写的其他信息：如您在个人资料中主动填写的联系方式、收货地址等信息。</Text>

          <Text className='text sub-title'>2. 使用服务过程中产生的信息</Text>
          <Text className='text'>（1）预约与订单信息：包括预约日期、时段、人数、订单金额、支付状态等，用于预约管理和提供服务；</Text>
          <Text className='text'>（2）渔获记录信息：包括您记录的渔获种类、重量、时间等信息，用于积分累计和个人渔获统计；</Text>
          <Text className='text'>（3）积分与会员信息：包括积分变动记录、会员等级、会员有效期等，用于会员权益管理；</Text>
          <Text className='text'>（4）兑换码信息：当您使用兑换码功能时，我们会记录兑换码的使用情况及发放的权益。</Text>

          <Text className='text sub-title'>3. 设备与日志信息</Text>
          <Text className='text'>（1）设备信息：包括设备型号、操作系统版本、设备标识符等，用于保障服务安全与兼容性；</Text>
          <Text className='text'>（2）操作日志：包括您使用本服务的时间、浏览记录、点击行为等，用于改进产品和优化用户体验。</Text>

          <Text className='text sub-title'>4. 位置信息</Text>
          <Text className='text'>当您使用导航功能时，我们会在征得您的单独授权后获取您的位置信息，用于为您提供前往水库的路线导航。您可以随时在微信设置中关闭位置权限，关闭后不影响其他功能的使用。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>二、我们如何使用信息</Text>
          <Text className='text'>我们收集的信息将用于以下用途：</Text>
          <Text className='text'>1. 账号注册与登录：用于验证您的身份，创建和管理您的账号；</Text>
          <Text className='text'>2. 预约与支付服务：用于处理您的预约订单、完成支付流程、发送预约确认与提醒；</Text>
          <Text className='text'>3. 会员与积分服务：用于会员等级管理、积分累计与兑换；</Text>
          <Text className='text'>4. 渔获记录服务：用于记录和展示您的渔获信息，生成个人统计数据；</Text>
          <Text className='text'>5. 导航服务：用于向您提供前往水库的路线导航；</Text>
          <Text className='text'>6. 客户服务：用于处理您的咨询、投诉与建议；</Text>
          <Text className='text'>7. 安全防护：用于检测、预防和处置可能存在的欺诈、安全漏洞等风险；</Text>
          <Text className='text'>8. 服务改进：用于分析用户使用情况，优化产品功能和用户体验。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>三、权限使用说明</Text>
          <Text className='text'>本服务在您使用特定功能时，可能会申请以下权限：</Text>
          <Text className='text'>1. <Text className='bold'>位置信息权限</Text>：仅当您主动使用"水库导航"功能时申请，用于获取您的位置以提供导航服务。您拒绝授权不影响其他功能的使用；</Text>
          <Text className='text'>2. <Text className='bold'>摄像头权限</Text>：仅当您使用"扫码兑换"功能时申请，用于扫描兑换码二维码。您拒绝授权时可通过手动输入兑换码的方式完成兑换；</Text>
          <Text className='text'>3. <Text className='bold'>获取手机号</Text>：仅当您选择"手机号快捷登录"时使用微信官方手机号快速验证组件获取您的手机号码，用于账号绑定与识别。手机号仅用于本服务内部，不会用于其他用途。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>四、信息的存储</Text>
          <Text className='text'>1. <Text className='bold'>存储地点</Text>：您的个人信息将存储于中华人民共和国境内的服务器上。我们不会将您的个人信息传输至境外；</Text>
          <Text className='text'>2. <Text className='bold'>存储期限</Text>：我们仅在实现本政策所述目的所必需的期限内保留您的个人信息。当您注销账号或超过法定保留期限后，我们将对您的个人信息进行删除或匿名化处理；</Text>
          <Text className='text'>3. <Text className='bold'>存储方式</Text>：我们采用加密存储、访问控制、身份鉴别等多种技术手段保护您的个人信息安全。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>五、信息共享、转让与公开披露</Text>
          <Text className='text'>1. <Text className='bold'>共享</Text>：我们不会与任何公司、组织和个人共享您的个人信息，但以下情况除外：</Text>
          <Text className='text'>（1）获得您的明确同意或授权后共享；</Text>
          <Text className='text'>（2）根据法律法规的规定、诉讼争议解决需要，或行政、司法机关依法提出的要求而共享；</Text>
          <Text className='text'>（3）与具有合法资质的第三方服务商（如微信支付）共享实现服务所必需的信息，此类共享仅限实现服务目的所必需的最小范围。</Text>
          <Text className='text'>2. <Text className='bold'>转让</Text>：我们不会将您的个人信息转让给任何公司、组织和个人，但涉及合并、收购或破产清算时，如涉及个人信息转让，我们会要求新的持有方继续受本政策的约束。</Text>
          <Text className='text'>3. <Text className='bold'>公开披露</Text>：我们仅会在以下情形下公开披露您的个人信息：</Text>
          <Text className='text'>（1）获得您明确的单独同意；</Text>
          <Text className='text'>（2）基于法律法规的强制要求。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>六、第三方服务说明</Text>
          <Text className='text'>本服务可能接入以下第三方服务，第三方服务可能收集您的必要信息：</Text>
          <Text className='text'>1. <Text className='bold'>微信开放平台（微信登录）</Text>：用于微信账号授权登录。收集的信息包括微信昵称、头像、OpenID等，由腾讯公司处理，具体请参见《微信隐私保护指引》；</Text>
          <Text className='text'>2. <Text className='bold'>微信支付</Text>：用于处理在线支付。收集的信息包括订单号、支付金额等必要信息，由腾讯公司处理；</Text>
          <Text className='text'>3. <Text className='bold'>微信手机号快速验证组件</Text>：用于手机号快捷登录。收集的信息包括您的手机号码，由腾讯公司提供校验服务。</Text>
          <Text className='text'>上述第三方服务将按照其自身的隐私政策处理您的信息，我们建议您仔细阅读相关第三方的隐私政策。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>七、您的权利</Text>
          <Text className='text'>根据相关法律法规，您对您的个人信息享有以下权利：</Text>
          <Text className='text'>1. <Text className='bold'>访问权</Text>：您可以在小程序"我的"页面查看您的基本资料、预约记录、渔获记录和积分信息；</Text>
          <Text className='text'>2. <Text className='bold'>更正权</Text>：您可以修改或更正您的个人资料信息；</Text>
          <Text className='text'>3. <Text className='bold'>删除权</Text>：在符合法律法规规定的情形下，您可以申请删除您的个人信息；</Text>
          <Text className='text'>4. <Text className='bold'>撤回同意权</Text>：您可以随时在微信的设置中撤回对位置、摄像头等权限的授权；</Text>
          <Text className='text'>5. <Text className='bold'>注销权</Text>：您可以通过联系我们注销您的账号，注销后我们将删除或匿名化处理您的个人信息；</Text>
          <Text className='text'>6. <Text className='bold'>投诉举报权</Text>：如您认为我们的个人信息处理行为损害了您的合法权益，您可以向有关部门投诉举报。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>八、未成年人保护</Text>
          <Text className='text'>
            我们非常重视对未成年人个人信息的保护。若您是未满14周岁的未成年人，请在监护人陪同下仔细阅读本隐私政策，并在征得您的父母或监护人明确同意后再使用我们的服务。我们将根据相关法律法规的要求保护未成年人的个人信息。
          </Text>
          <Text className='text'>
            若您是未成年人的监护人，发现我们在未获得您同意的情况下处理了您所监护的未成年人的个人信息，请及时联系我们，我们将在核实后尽快删除相关信息。
          </Text>
        </View>

        <View className='section'>
          <Text className='section-title'>九、隐私政策的更新</Text>
          <Text className='text'>
            我们可能适时对本隐私政策进行修订。政策更新后，我们会在小程序内以适当方式通知您，并在本页面展示最新版本。若修订涉及对您权益的重大变更，我们将以更显著的方式（如弹窗提示）通知您并重新征求您的同意。
          </Text>
          <Text className='text'>本政策所指的重大变更包括但不限于：服务的业务模式发生重大变化、个人信息处理目的和处理方式发生重大变化、负责处理个人信息安全的责任部门或联系方式变更等。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>十、联系我们</Text>
          <Text className='text'>如您对本隐私政策有任何疑问、意见或建议，或需要行使您的个人信息相关权利，可通过以下方式联系我们：</Text>
          <Text className='text'>客服电话：13800000000{'\n'}
            客服微信：丰鱼天下{'\n'}
            运营方：丰城隆龙农业发展有限公司{'\n'}
            地址：江西省丰城市{'\n'}
            工作时间：每日 6:00 - 22:00</Text>
          <Text className='text'>我们将在收到您的请求后15个工作日内回复处理意见或结果。如您对我们的处理结果不满意，您还可以向个人信息保护部门或相关监管机构进行投诉。</Text>
        </View>

        <View className='section'>
          <Text className='section-title'>附：个人信息收集清单</Text>
          <Text className='text table-note'>为便于您快速了解我们收集的个人信息类型，现汇总如下：</Text>
          <View className='table'>
            <View className='table-row table-head'>
              <View className='table-cell col-a'>信息类型</View>
              <View className='table-cell col-b'>具体内容</View>
              <View className='table-cell col-c'>使用目的</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>微信账号信息</View>
              <View className='table-cell col-b'>微信昵称、头像、OpenID</View>
              <View className='table-cell col-c'>账号注册与登录</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>手机号码</View>
              <View className='table-cell col-b'>手机号快捷登录时获取</View>
              <View className='table-cell col-c'>账号绑定、预约通知</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>位置信息</View>
              <View className='table-cell col-b'>GPS定位（需授权）</View>
              <View className='table-cell col-c'>水库导航</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>订单信息</View>
              <View className='table-cell col-b'>预约日期、时段、人数、金额</View>
              <View className='table-cell col-c'>预约与支付管理</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>渔获记录</View>
              <View className='table-cell col-b'>渔获种类、重量、时间</View>
              <View className='table-cell col-c'>积分累计、个人统计</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>设备信息</View>
              <View className='table-cell col-b'>设备型号、系统版本</View>
              <View className='table-cell col-c'>服务安全与兼容</View>
            </View>
            <View className='table-row'>
              <View className='table-cell col-a'>使用日志</View>
              <View className='table-cell col-b'>浏览、点击、操作记录</View>
              <View className='table-cell col-c'>产品优化与服务改进</View>
            </View>
          </View>
        </View>

      </View>
    </View>
  )
}
