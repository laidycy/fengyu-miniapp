import { http } from './request'
import type { PricingConfig } from '../types'

/**
 * 价格配置 API —— 对齐正式版后端 /api/config
 */

// 获取价格配置（时段/定金比例/会员折扣/等级/开放天数）
// GET /api/config/pricing → PricingConfig
export function getPricingConfig(): Promise<PricingConfig> {
  return http.get<PricingConfig>('/api/config/pricing')
}
