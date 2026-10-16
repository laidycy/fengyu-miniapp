import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getPricingConfig } from '../../utils/api/pricing'
import { createOrder, updateOrder, getOrderDetail } from '../../utils/api/orders'
import { payForOrder } from '../../utils/payment'
import { getOrderQrCode } from '../../utils/api/qrcode'
import { isLoggedIn, showToast, getCachedUserInfo } from '../../utils/index'
import { useLoginModal } from '../../hooks/useLoginModal'
import { GEAR_ITEMS, buildGearPayload, gearDisplayText, parseGearValue, parseGearRemark } from '../../utils/gear'
import type { TimeSlot, PricingConfig } from '../../utils/types'
import loginLogo from '../../assets/logo.png'
import './index.scss'

// 步骤流程（对齐线上）。showSlot=false（后台关"时段选择"总开关）时去掉"选择时段"，
// 预约直接 选日期 → 填人数 → 钓位 → 安全须知 → 确认（按全天 allday 计费）
const STEPS_FULL = ['选择日期', '选择时段', '填写人数', '渔具租赁', '安全须知', '确认支付']
// 业务键序列（与步骤文案一一对应），用于渲染/校验时判断当前是哪个业务步
const STEP_KEYS_FULL = ['date', 'slot', 'people', 'gear', 'safety', 'confirm']
const STEPS_NO_SLOT = ['选择日期', '填写人数', '渔具租赁', '安全须知', '确认支付']
const STEP_KEYS_NO_SLOT = ['date', 'people', 'gear', 'safety', 'confirm']

// 安全须知（12条，与 SafetyNoticePage SAFETY_RULES 保持一致）
const SAFETY_RULES = [
  '1. 本垂钓基地为户外水域场所，请认真阅读并遵守本安全须知。',
  '2. 未成年人、不会游泳者、酒后及身体不适者禁止下水，禁止靠近深水区。',
  '3. 垂钓全程请穿戴安全装备，遵守现场工作人员指引，服从安全管理。',
  '4. 严禁在雷雨、大风等恶劣天气下垂钓；遇突发天气请立即撤离至安全区域。',
  '5. 爱护环境卫生，勿乱丢垃圾；鱼获按基地规定处理，禁止电鱼、毒鱼等违法捕捞。',
  '6. 垂钓及往返途中的人身、财产安全由本人负责，请自行购买相应保险。',
  '7. 请在指定区域内垂钓，进入基地即视为同意本须知全部条款。',
  '8. 垂钓属高风险户外水域活动，存在溺水、滑倒、鱼钩划伤、天气突变等固有风险。您系在知晓并自愿参加、风险自担的前提下参与活动；进入场地即视为您对自身安全及行为负完全责任。',
  '9. 请自行妥善保管车辆、渔具、手机、现金等随身及车内财物，遗失、损坏或被盗，本公司不承担保管及赔偿责任。',
  '10. 未成年人、无完全民事行为能力人入场须由具备监护能力的成年人全程陪同并负责其安全。',
  '11. 如您患有心脑血管疾病、癫痫、高血压等不宜垂钓或剧烈活动的疾病，请勿入场或量力而行；如遇身体不适，请第一时间联系现场工作人员，紧急情况请拨打120。',
  '12. 场内垂钓凭小程序订单入场核销。本平台支付的费用中，目前仅会员费及农副产品类消费可开具电子发票，需开票请凭支付记录线下联系客服办理（电话13800000000）。'
]

// 会员等级名称
const LEVEL_NAMES: Record<string, string> = {
  diamond: '钻石会员',
  gold: '金卡会员',
  silver: '银卡会员',
  guest: '散客'
}

interface DateOption {
  date: string
  week: string
  day: string
  available: boolean
}

interface SlotOption {
  key: TimeSlot
  label: string
  time: string
  price: number
}

export default function BookingPage() {
  const login = useLoginModal()
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [dates, setDates] = useState<DateOption[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>('morning')
  const [peopleCount, setPeopleCount] = useState(1)
  // 真实可视高度(已扣原生导航栏)，用于让底部操作栏贴底且内容区自适应，避免空行
  const windowHeight = Taro.getSystemInfoSync().windowHeight
  const [safetyChecked, setSafetyChecked] = useState(false)
  const [editOrderId, setEditOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookingCode, setBookingCode] = useState('')
  const [orderId, setOrderId] = useState('')
  const [qrCodeBase64, setQrCodeBase64] = useState('')
  // 渔具租赁需求
  const [gearNeed, setGearNeed] = useState(false)
  const [gearRods, setGearRods] = useState(0)
  const [gearBait, setGearBait] = useState(0)
  const [gearItems, setGearItems] = useState<string[]>([])
  const [gearNote, setGearNote] = useState('')

  // 当前用户
  const userInfo = getCachedUserInfo()
  const isLogin = isLoggedIn()
  const memberLevel = userInfo?.member?.level || 'guest'
  const memberDiscount = config?.memberLevels?.find(l => l.level === memberLevel)?.discount || 1

  // 时段选择总开关：后台"价格设置-启用时段选择"关闭(slotSelectionEnabled=false)时，
  // 预约流程隐藏"选择时段"步，直接按全天(allday)计费。未加载/默认视为开启。
  const showSlot = config?.slotSelectionEnabled !== false
  const steps = showSlot ? STEPS_FULL : STEPS_NO_SLOT
  const stepKeys = showSlot ? STEP_KEYS_FULL : STEP_KEYS_NO_SLOT
  const totalSteps = steps.length
  const cur = stepKeys[step - 1] || 'date' // 当前业务步：date/slot/people/spot/safety/confirm

  // 时段列表（优先后端配置，兜底线上写死的）
  // 后端 /api/config/pricing 返回 { key, label, time, price } + slotEnabled（false 则隐藏该时段）
  // 旧前端误读 name/timeRange，这里兼容
  const timeSlots: SlotOption[] = useMemo(() => {
    if (config?.timeSlots?.length) {
      return config.timeSlots
        .filter(s => {
          // slotEnabled 显式 false 才隐藏；未配置/undefined 视为可用
          const enabled = config.slotEnabled?.[s.key]
          return enabled !== false
        })
        .map(s => ({
          key: s.key,
          label: s.label ?? (s as any).name,
          time: s.time ?? (s as any).timeRange,
          price: s.price
        }))
    }
    return [
      { key: 'morning', label: '早场', time: '06:00-12:00', price: 0.01 },
      { key: 'afternoon', label: '午场', time: '12:00-18:00', price: 0.02 },
      { key: 'evening', label: '晚场', time: '18:00-22:00', price: 0.03 },
      { key: 'allday', label: '全天', time: '06:00-22:00', price: 0.04 }
    ]
  }, [config])

  const selectedSlotInfo = timeSlots.find(s => s.key === selectedSlot)
  const bookingOpenDays = config?.bookingOpenDays || 7
  const depositRate = config?.depositRate || 0.3

  // config 加载后，若当前选中时段不可用（被 slotEnabled 隐藏），自动切到第一个可用时段
  useEffect(() => {
    if (timeSlots.length && !timeSlots.some(s => s.key === selectedSlot)) {
      setSelectedSlot(timeSlots[0].key)
    }
  }, [timeSlots, selectedSlot])

  // 时段选择总开关关闭时：强制按"全天(allday)"计费（时段页被隐藏，无用户选择）
  useEffect(() => {
    if (!showSlot && selectedSlot !== 'allday') {
      setSelectedSlot('allday')
    }
  }, [showSlot, selectedSlot])

  // 金额计算（对齐后端：分位四舍五入，避免 JS Math.round(元值) 把 .5 进位导致优惠变 0）
  // 例：全天5元×金卡0.9=4.5 → 应显示 4.50，若对"元"round 会得 5 → 优惠 0（bug）
  const totalAmount = selectedSlotInfo ? selectedSlotInfo.price * peopleCount : 0
  const actualAmount = Math.round(totalAmount * (memberDiscount || 1) * 100) / 100
  const deposit = Math.round(actualAmount * depositRate * 100) / 100

  // 渔具租赁需求：need=false 时摘要为空（订单不写备注）
  const gearDemand = useMemo(
    () => ({ need: gearNeed, rods: gearRods, bait: gearBait, items: gearItems, note: gearNote }),
    [gearNeed, gearRods, gearBait, gearItems, gearNote]
  )
  const gearPayload = buildGearPayload(gearDemand)
  const gearText = gearDisplayText(gearDemand)

  const toggleGearItem = (key: string) => {
    setGearItems(prev => (prev.indexOf(key) >= 0 ? prev.filter(k => k !== key) : [...prev, key]))
  }

  // 免付款预约：后台"全天价格"设为 0 时，预约直接生成订单二维码、无需付款（后端下发 freeBooking）。
  // 前端仅在实付金额为 0 时才跳过支付（与服务端 totalAmount===0 判定一致，避免误跳支付）。
  const freeBooking = config?.freeBooking === true && Math.round(actualAmount * 100) === 0

  useEffect(() => {
    loadConfig()
    // 处理编辑回传（从订单详情进入）
    const params = Taro.getCurrentInstance().router?.params
    if (params?.edit) {
      setEditOrderId(params.edit)
    }
  }, [])

  // 编辑模式：回填原订单的 日期/时段/人数，避免用户直接下一步把订单静默改成默认值
  useEffect(() => {
    if (!editOrderId || !config) return
    let alive = true
    getOrderDetail(editOrderId)
      .then((o) => {
        if (!alive || !o) return
        if (o.date) setSelectedDate(String(o.date).slice(0, 10))
        if (o.timeSlot) setSelectedSlot(o.timeSlot as TimeSlot)
        if (o.peopleCount) setPeopleCount(Number(o.peopleCount) || 1)
        // 编辑回填：优先新字段 gearRental，兼容旧备注格式
        const g = parseGearValue(o.gearRental) || parseGearRemark(o.remark)
        if (g) {
          setGearNeed(true)
          setGearRods(g.rods)
          setGearBait(g.bait)
          setGearItems(g.items)
          setGearNote(g.note)
        }
      })
      .catch(() => { /* 回填失败不阻塞，用户可手动选择 */ })
    return () => { alive = false }
  }, [editOrderId, config])

  const loadConfig = async () => {
    try {
      const data = await getPricingConfig()
      setConfig(data)
      // 生成日期（对齐线上 generateDates）
      const days = data.bookingOpenDays || 7
      const list: DateOption[] = []
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const now = new Date()
      for (let i = 0; i < days; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        // 今日起可预约（含当日）
        const dateStr = fmtDate(d)
        list.push({
          date: dateStr,
          week: weekdays[d.getDay()],
          day: `${d.getMonth() + 1}/${d.getDate()}`,
          available: true
        })
      }
      setDates(list)
      setSelectedDate(list[0]?.date || '')
    } catch {
      // 兜底生成 7 天
      const list: DateOption[] = []
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const now = new Date()
      for (let i = 0; i < 7; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        list.push({
          date: fmtDate(d),
          week: weekdays[d.getDay()],
          day: `${d.getMonth() + 1}/${d.getDate()}`,
          available: true
        })
      }
      setDates(list)
      setSelectedDate(list[0]?.date || '')
    }
  }

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 下一步
  const handleNext = () => {
    // 校验各业务步
    if (cur === 'date' && !selectedDate) {
      showToast('请选择垂钓日期', 'none')
      return
    }
    if (cur === 'slot' && !selectedSlot) {
      showToast('请选择垂钓时段', 'none')
      return
    }
    if (cur === 'gear') {
      if (gearNeed && gearRods === 0 && gearBait === 0 && gearItems.length === 0) {
        showToast('请选择需要租赁的渔具，或选「不需要」', 'none')
        return
      }
    }
    if (cur === 'safety') {
      if (!safetyChecked) {
        showToast('请先阅读并同意安全须知', 'none')
        return
      }
      if (!isLogin) {
        login.openLogin()
        return
      }
    }
    setStep(Math.min(totalSteps, step + 1))
  }

  const handlePrev = () => {
    setStep(Math.max(1, step - 1))
  }

  // 手机号快捷登录（getPhoneNumber）
  const handleGetPhoneNumber = async (e: any) => {
    const code = e.detail?.code
    const errMsg = e.detail?.errMsg || ''
    if (!code) {
      console.error('[绑定手机号] 微信未返回 code, errMsg:', errMsg)
      if (errMsg.includes('deny') || errMsg.includes('denied') || errMsg.includes('user')) {
        showToast('已取消手机号授权', 'none')
      } else if (errMsg.includes('no permission') || errMsg.includes('permission')) {
        showToast('未开通手机号授权能力，请联系管理员', 'none')
      } else if (errMsg) {
        showToast(`授权失败：${errMsg}`, 'none')
      } else {
        showToast('授权失败，请重试', 'none')
      }
      return
    }
    setLoading(true)
    try {
      const { bindPhoneWithWechat } = require('../../utils/login')
      const ok = await bindPhoneWithWechat(code)
      if (ok) showToast('手机号绑定成功', 'success')
    } catch {
      showToast('绑定失败', 'none')
    }
    setLoading(false)
  }

  // 支付
  const handlePay = async () => {
    if (!isLogin) {
      login.openLogin()
      return
    }
    // 需绑定手机号
    if (!userInfo?.isPhoneBound) {
      showToast('请先绑定手机号', 'none')
      return
    }
    if (!selectedDate || !selectedSlotInfo) {
      showToast('请选择日期和时段', 'none')
      return
    }

    setLoading(true)
    try {
      let id = editOrderId
      let bCode = ''
      let isFree = freeBooking

      if (editOrderId) {
        // 编辑订单
        const updated = await updateOrder(editOrderId, {
          date: selectedDate,
          timeSlot: selectedSlot,
          peopleCount,
          gearRental: gearPayload
        })
        id = editOrderId
        bCode = updated?.bookingCode || ''
        if (updated?.freeBooking) isFree = true
      } else {
        // 创建订单（金额由服务端算）
        const order = await createOrder({
          date: selectedDate,
          timeSlot: selectedSlot,
          peopleCount,
          gearRental: gearPayload
        })
        id = order.id
        bCode = order.bookingCode || ''
        if (order.freeBooking) isFree = true
      }

      // 免付款预约（全天价格为 0）：后端已直接生成订单并标记已支付，跳过支付直接进入成功页
      if (isFree) {
        setBookingCode(bCode)
        setOrderId(id)
        setShowSuccess(true)
        showToast(editOrderId ? '修改成功' : '预约成功', 'success')
        loadQrCode(id)
        setLoading(false)
        return
      }

      // 统一下单 + 拉起微信支付（未支付留在本页，成功才进入成功页）
      const paid = await payForOrder(id)
      if (!paid) {
        // 用户取消或支付失败：订单保持未支付，留在确认页
        setLoading(false)
        return
      }

      setBookingCode(bCode)
      setOrderId(id)
      setShowSuccess(true)
      showToast(editOrderId ? '修改成功' : '预约成功', 'success')
      loadQrCode(id)
    } catch (err: any) {
      console.error('预约失败:', err)
      showToast(err.message || '预约失败', 'none')
    }
    setLoading(false)
  }

  // 加载核销二维码
  const loadQrCode = async (id: string) => {
    try {
      const res = await getOrderQrCode(id)
      setQrCodeBase64(res.qrcode.replace(/^data:image\/png;base64,/, ''))
    } catch {
      // ignore
    }
  }

  // 登录统一走页面级 useLoginModal 弹窗（login.openLogin）

  // 成功页
  if (showSuccess) {
    return (
      <View className='success-page'>
        <View className='success-content'>
          <View className='success-icon-wrap'>
            <Text className='success-icon'>✓</Text>
          </View>
          <Text className='success-title'>预约成功</Text>
          <Text className='success-subtitle'>{selectedDate} {selectedSlotInfo?.label}</Text>

          <View className='booking-code-card'>
            <View className='code-card-inner'>
              {qrCodeBase64 ? (
                <Image className='qr-code-image' src={`data:image/png;base64,${qrCodeBase64}`} mode='widthFix' />
              ) : (
                <Text className='qr-placeholder'>加载中...</Text>
              )}
              <Text className='code-number'>{bookingCode}</Text>
              <Text className='code-tip'>到场出示此码核销</Text>
            </View>
          </View>

          <View className='success-actions'>
            <Button className='success-btn success-btn-outline' onClick={() => Taro.switchTab({ url: '/pages/HomePage/index' })}>
              返回首页
            </Button>
            <Button
              className='success-btn success-btn-primary'
              onClick={() => Taro.redirectTo({ url: '/pages/OrderListPage/index' })}
            >
              查看订单
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    // flex 纵向布局占满可视高度：步骤条 + 内容区(flex:1) + 底部操作栏贴底，无空行
    <View className='page booking-page' style={{ height: `${windowHeight}px` }}>
      {/* 步骤条 */}
      <View className='steps-bar'>
        <View className='steps-row'>
          {steps.map((label, idx) => {
            const n = idx + 1
            const active = step === n
            const done = step > n
            return (
              <View key={label} className='step-item'>
                {idx < steps.length - 1 && (
                  <View className={`step-connector ${done ? 'step-connector-done' : 'step-connector-pending'}`} />
                )}
                <View className={`step-dot ${done ? 'step-dot-done' : active ? 'step-dot-active' : 'step-dot-pending'}`}>
                  <Text>{done ? '✓' : n}</Text>
                </View>
                <Text className={`step-label ${active || done ? 'step-label-active' : 'step-label-pending'}`}>{label}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 步骤内容 */}
      <ScrollView scrollY className='step-content'>
        {cur === 'date' && (
          <View className='step-card'>
            <View className='step-title'>
              <Text className='step-title-icon'>📅</Text>
              <Text>选择垂钓日期</Text>
            </View>
            <View className='date-grid'>
              {dates.map(d => (
                <View
                  key={d.date}
                  className={`date-btn ${selectedDate === d.date ? 'date-btn-selected' : d.available ? 'date-btn-available' : 'date-btn-disabled'}`}
                  onClick={d.available ? () => setSelectedDate(d.date) : undefined}
                >
                  <Text className='date-btn-week'>{d.week}</Text>
                  <Text className='date-btn-day'>{d.day}</Text>
                  {!d.available && <Text className='date-btn-full'>已满</Text>}
                </View>
              ))}
            </View>
            <Text className='date-hint'>可预约今日起{bookingOpenDays}天</Text>
          </View>
        )}

        {cur === 'slot' && (
          <View className='step-card'>
            <View className='step-title'>
              <Text className='step-title-icon'>🕐</Text>
              <Text>选择垂钓时段</Text>
            </View>
            <View className='slot-list'>
              {timeSlots.map(t => (
                <View
                  key={t.key}
                  className={`slot-btn ${selectedSlot === t.key ? 'slot-btn-selected' : ''}`}
                  onClick={() => setSelectedSlot(t.key)}
                >
                  <View className='slot-btn-inner'>
                    <View>
                      <View className='slot-name'>{t.label}</View>
                      <View className='slot-time'>{t.time}</View>
                    </View>
                    <View>
                      <View className='slot-price'>¥{t.price}</View>
                      <View className='slot-price-unit'>每人</View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {cur === 'people' && (
          <View className='step-card'>
            <View className='step-title'>
              <Text className='step-title-icon'>👤</Text>
              <Text>填写同行人数</Text>
            </View>
            <View className='people-row'>
              <Text className='people-label'>同行人数</Text>
              <View className='people-controls'>
                <View className='people-btn people-btn-minus' onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>
                  <Text>-</Text>
                </View>
                <Text className='people-count'>{peopleCount}</Text>
                <View className='people-btn people-btn-plus' onClick={() => setPeopleCount(Math.min(10, peopleCount + 1))}>
                  <Text>+</Text>
                </View>
              </View>
            </View>

            <View className='fee-preview'>
              <View className='fee-row'>
                <Text className='fee-label'>单价</Text>
                <Text className='fee-value'>¥{selectedSlotInfo?.price || 0}/人</Text>
              </View>
              <View className='fee-row'>
                <Text className='fee-label'>人数</Text>
                <Text className='fee-value'>{peopleCount}人</Text>
              </View>
              <View className='fee-row'>
                <Text className='fee-label'>{LEVEL_NAMES[memberLevel] || '散客'}优惠</Text>
                <Text className='fee-value' style={{ color: '#2E7D32' }}>
                  {memberDiscount < 1 ? `${Math.round(10 * (1 - memberDiscount))}折` : '无'}
                </Text>
              </View>
              <View className='fee-total'>
                <Text className='fee-total-label'>应付金额</Text>
                <Text className='fee-total-value'>¥{actualAmount}</Text>
              </View>
            </View>
          </View>
        )}

        {cur === 'gear' && (
          <View className='step-card'>
            <View className='step-title'>
              <Text className='step-title-icon'>🎣</Text>
              <Text>渔具租赁</Text>
            </View>
            <Text className='gear-desc'>需要基地提供渔具的钓友请提前登记，便于我们为您备好装备（数量以到场实际为准）。</Text>

            <View className='gear-need-row'>
              <View
                className={`gear-need-btn ${!gearNeed ? 'gear-need-btn-on' : ''}`}
                onClick={() => setGearNeed(false)}
              >
                <Text className='gear-need-emoji'>🙋</Text>
                <Text className='gear-need-label'>不需要（自带装备）</Text>
              </View>
              <View
                className={`gear-need-btn ${gearNeed ? 'gear-need-btn-on' : ''}`}
                onClick={() => setGearNeed(true)}
              >
                <Text className='gear-need-emoji'>🎣</Text>
                <Text className='gear-need-label'>需要租赁</Text>
              </View>
            </View>

            {gearNeed && (
              <View className='gear-form'>
                <View className='gear-item-row'>
                  <View className='gear-item-info'>
                    <Text className='gear-item-name'>🎣 钓鱼竿</Text>
                    <Text className='gear-item-hint'>手竿 / 海竿，到场挑选</Text>
                  </View>
                  <View className='gear-stepper'>
                    <View
                      className={`gear-step-btn ${gearRods <= 0 ? 'gear-step-btn-off' : ''}`}
                      onClick={() => setGearRods(Math.max(0, gearRods - 1))}
                    ><Text>-</Text></View>
                    <Text className='gear-step-num'>{gearRods}</Text>
                    <View
                      className={`gear-step-btn ${gearRods >= 5 ? 'gear-step-btn-off' : ''}`}
                      onClick={() => setGearRods(Math.min(5, gearRods + 1))}
                    ><Text>+</Text></View>
                  </View>
                </View>

                <View className='gear-item-row'>
                  <View className='gear-item-info'>
                    <Text className='gear-item-name'>🪱 鱼饵</Text>
                    <Text className='gear-item-hint'>按份计，约每竿一份</Text>
                  </View>
                  <View className='gear-stepper'>
                    <View
                      className={`gear-step-btn ${gearBait <= 0 ? 'gear-step-btn-off' : ''}`}
                      onClick={() => setGearBait(Math.max(0, gearBait - 1))}
                    ><Text>-</Text></View>
                    <Text className='gear-step-num'>{gearBait}</Text>
                    <View
                      className={`gear-step-btn ${gearBait >= 10 ? 'gear-step-btn-off' : ''}`}
                      onClick={() => setGearBait(Math.min(10, gearBait + 1))}
                    ><Text>+</Text></View>
                  </View>
                </View>

                <Text className='gear-sub-title'>配套设备（可多选）</Text>
                <View className='gear-grid'>
                  {GEAR_ITEMS.map(it => {
                    const on = gearItems.indexOf(it.key) >= 0
                    return (
                      <View
                        key={it.key}
                        className={`gear-chip ${on ? 'gear-chip-on' : ''}`}
                        onClick={() => toggleGearItem(it.key)}
                      >
                        <Text>{it.label}</Text>
                      </View>
                    )
                  })}
                </View>

                <View className='gear-note'>
                  <Text className='gear-note-label'>补充说明（选填）</Text>
                  <Input
                    className='gear-note-input'
                    value={gearNote}
                    onInput={(e: any) => setGearNote(e.detail.value)}
                    placeholder='如：需要 4.5 米手竿、大号抄网等'
                    maxlength={50}
                  />
                </View>
              </View>
            )}

            <View className='gear-summary'>
              <Text className='gear-summary-text'>
                {gearNeed ? `已登记：${gearText}` : '无需渔具租赁，到场自带装备'}
              </Text>
            </View>
          </View>
        )}

        {cur === 'safety' && (
          <View className='step-card'>
            <View className='step-title'>
              <Text className='step-title-icon'>⚠️</Text>
              <Text>安全须知与手机号</Text>
            </View>
            <Text className='safety-title'>📖 安全须知</Text>
            <ScrollView scrollY className='safety-scroll'>
              {SAFETY_RULES.map((rule, i) => (
                <View key={i} className='safety-line'>
                  <Text className='safety-line-text'>{rule}</Text>
                </View>
              ))}
            </ScrollView>

            <View className='safety-agree' onClick={() => setSafetyChecked(!safetyChecked)}>
              <View className={`safety-checkbox ${safetyChecked ? 'safety-checkbox-checked' : ''}`}>
                {safetyChecked && <Text className='safety-checkbox-mark'>✓</Text>}
              </View>
              <Text className='safety-agree-text'>我已阅读并同意《安全须知》的全部条款</Text>
            </View>

            <View className='safety-phone-block'>
              <View className='safety-phone-title'>📱 绑定手机号</View>
              <View className='safety-phone-desc'>
                预约需绑定手机号，用于接收预约通知与核销确认。手机号将绑定当前账号。
              </View>
              {userInfo?.isPhoneBound ? (
                <View className='phone-bound-box'>
                  <Text className='phone-bound-icon'>✅</Text>
                  <View className='phone-bound-info'>
                    <Text className='phone-bound-label'>已绑定手机号</Text>
                    <Text className='phone-bound-value'>
                      {userInfo?.phone ? maskPhone(userInfo.phone) : '已绑定'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Button
                  className={`phone-auth-btn ${isLogin ? '' : 'phone-auth-btn-disabled'}`}
                  openType={isLogin ? 'getPhoneNumber' : undefined}
                  onGetPhoneNumber={handleGetPhoneNumber}
                >
                  <Text className='phone-auth-btn-icon'>📞</Text>
                  <Text className='phone-auth-btn-text'>手机号快捷登录</Text>
                </Button>
              )}
              {!isLogin && (
                <View className='phone-auth-tip' onClick={() => login.openLogin()}>
                  <Text>尚未登录，请先登录后再绑定手机号 ›</Text>
                </View>
              )}
              {userInfo?.isPhoneBound && (
                <View className='phone-auth-tip'>
                  <Text>手机号将用于预约通知，请确保信息准确。</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {cur === 'confirm' && (
          <View>
            <View className='order-confirm-card'>
              <Text className='confirm-title'>订单确认</Text>
              <View className='confirm-row'>
                <Text className='confirm-label'>垂钓日期</Text>
                <Text className='confirm-value'>{selectedDate}</Text>
              </View>
              <View className='confirm-row'>
                <Text className='confirm-label'>垂钓时段</Text>
                <Text className='confirm-value'>{selectedSlotInfo?.label} {selectedSlotInfo?.time}</Text>
              </View>
              <View className='confirm-row'>
                <Text className='confirm-label'>同行人数</Text>
                <Text className='confirm-value'>{peopleCount}人</Text>
              </View>
              <View className='confirm-row'>
                <Text className='confirm-label'>渔具租赁</Text>
                <Text className='confirm-value'>{gearText}</Text>
              </View>
            </View>

            {/* 会员卡 */}
            <View className='member-card'>
              <View className='member-row'>
                <View className='member-avatar' />
                <View className='member-info'>
                  <Text className='member-name'>{userInfo?.nickName || '钓友'}</Text>
                  <Text className='member-no'>{userInfo?.member?.memberNo || ''}</Text>
                </View>
                <Text className={`member-level-badge level-${memberLevel}`}>
                  {LEVEL_NAMES[memberLevel] || '散客'}
                </Text>
              </View>
            </View>

            {/* 费用明细 */}
            <View className='order-confirm-card'>
              <Text className='fee-detail-title'>费用明细</Text>
              <View className='fee-detail-row'>
                <Text className='fee-detail-label'>垂钓费用</Text>
                <Text className='fee-detail-value'>¥{totalAmount}</Text>
              </View>
              {memberDiscount < 1 && (
                <View className='fee-detail-row'>
                  <Text className='fee-detail-label'>会员优惠</Text>
                  <Text className='fee-detail-value fee-discount'>-¥{totalAmount - actualAmount}</Text>
                </View>
              )}
              {freeBooking ? (
                <View className='fee-deposit'>
                  <Text className='fee-deposit-label'>支付方式</Text>
                  <Text className='fee-deposit-value' style={{ color: '#2E7D32', fontWeight: 'bold' }}>免费预约 · 无需支付</Text>
                </View>
              ) : (
                <View className='fee-deposit'>
                  <Text className='fee-deposit-label'>
                    {Math.round(depositRate * 100) >= 100 ? '全额支付' : `定金（${Math.round(depositRate * 100)}%）`}
                  </Text>
                  <Text className='fee-deposit-value'>¥{deposit}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏（未登录时由绿色登录横幅替代，避免两个 fixed 重叠出白线） */}
      {isLogin && (
        <View className='bottom-bar'>
          <View className='bottom-bar-inner'>
            {step > 1 && (
              <View className='bottom-btn bottom-btn-prev' onClick={handlePrev}>
                <Text>上一步</Text>
              </View>
            )}
            {step < totalSteps ? (
              <View className='bottom-btn bottom-btn-next bottom-btn-green' onClick={handleNext}>
                <Text>下一步</Text>
              </View>
            ) : (
              <View
                className={`bottom-btn bottom-btn-pay${loading ? ' bottom-btn-disabled' : ''}`}
                onClick={loading ? undefined : handlePay}
              >
                <Text>{loading ? '处理中...' : (freeBooking ? '确认预约' : `立即支付 ¥${deposit}`)}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 未登录横幅 */}
      {!isLogin && (
        <View className='login-banner-fixed' onClick={() => login.openLogin()}>
          <View className='login-banner-fixed-left'>
            <View className='login-banner-fixed-icon'>
              <Image className='login-banner-fixed-logo' src={loginLogo} mode='aspectFit' />
            </View>
            <View className='login-banner-fixed-texts'>
              <Text className='login-banner-fixed-title'>快速登录丰鱼天下</Text>
              <Text className='login-banner-fixed-desc'>登录享完整预约 · 会员服务</Text>
            </View>
          </View>
          <View className='login-banner-fixed-btn'>
            <Text className='login-banner-fixed-btn-text'>立即登录</Text>
          </View>
        </View>
      )}

      {login.renderLogin}
    </View>
  )
}

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
