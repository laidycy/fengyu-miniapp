import Taro from '@tarojs/taro'
import { createUnifiedOrder, getPayStatus } from './api/pay'
import { showToast } from './index'

/**
 * 支付工具 —— 对齐正式版后端 /api/pay
 */

// 查询支付是否可用（mock 模式？）
export async function checkPayStatus(): Promise<{ ready: boolean; mock: boolean }> {
  try {
    const res = await getPayStatus()
    return { ready: res.ready, mock: res.mock }
  } catch {
    return { ready: false, mock: false }
  }
}

/**
 * 统一下单并拉起支付（订单支付）
 * @param orderId 订单 id
 * @returns 是否支付成功
 */
export async function payForOrder(orderId: string): Promise<boolean> {
  try {
    const res = await createUnifiedOrder({ orderType: 'order', orderId })

    // 已支付过（幂等）
    if (res.alreadyPaid) {
      showToast('订单已支付', 'success')
      return true
    }
    // 仅当后端明确返回 mock=true 才算成功；（正式版 PAY_MOCK=false，不能靠"无 payment"兜底误判成功）
    if (res.mock === true) {
      showToast('支付成功（测试）', 'success')
      return true
    }
    if (!res.payment) {
      throw new Error(res.message || '下单失败：未返回支付参数')
    }
    // 真实支付：拉起微信支付
    return await requestPayment(res.payment)
  } catch (err: any) {
    console.error('订单支付失败:', err)
    showToast(err.message || '支付失败', 'none')
    return false
  }
}

/**
 * 会员升级支付
 * @param level silver|gold|diamond
 */
export async function payForMemberLevel(level: 'silver' | 'gold' | 'diamond'): Promise<boolean> {
  try {
    const res = await createUnifiedOrder({ orderType: 'member', level })

    if (res.alreadyPaid) {
      showToast('会员已开通', 'success')
      return true
    }
    if (res.mock === true) {
      showToast('会员开通成功（测试）', 'success')
      return true
    }
    if (!res.payment) {
      throw new Error(res.message || '下单失败：未返回支付参数')
    }

    return await requestPayment(res.payment)
  } catch (err: any) {
    console.error('会员支付失败:', err)
    showToast(err.message || '支付失败', 'none')
    return false
  }
}

/**
 * 渔获账单支付（超重费用）
 * @param billId catch_bills.id
 * @returns 是否支付成功
 */
export async function payForCatchBill(billId: number): Promise<boolean> {
  try {
    const res = await createUnifiedOrder({ orderType: 'catch', billId })

    // 已支付过（幂等）
    if (res.alreadyPaid) {
      showToast('该账单已支付', 'success')
      return true
    }

    // 仅当后端明确 mock=true 才算成功（正式版不能靠"无 payment"兜底误判成功）
    if (res.mock === true) {
      showToast('支付成功（测试）', 'success')
      return true
    }
    if (!res.payment) {
      throw new Error(res.message || '下单失败：未返回支付参数')
    }

    // 真实支付：拉起微信支付
    return await requestPayment(res.payment)
  } catch (err: any) {
    console.error('渔获账单支付失败:', err)
    showToast(err.message || '支付失败', 'none')
    return false
  }
}

// 发起微信支付（核心）
async function requestPayment(params: {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}): Promise<boolean> {
  try {
    await Taro.requestPayment(params)
    return true
  } catch (err: any) {
    // 用户取消支付不算错误
    if (err.errMsg?.includes('cancel')) {
      showToast('已取消支付', 'none')
    } else {
      console.error('支付失败:', err)
      showToast('支付失败', 'none')
    }
    return false
  }
}
