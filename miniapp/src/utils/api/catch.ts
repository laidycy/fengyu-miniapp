import { http } from './request'
import type { CatchBill, CatchRecord, PageResult } from '../types'

/**
 * 渔获记录 API —— 对齐正式版后端 /api/catch-records
 * 说明：普通用户只能查自己；录入渔获是管理端功能（/api/admin/catch-records）
 */

// 获取本人渔获记录（分页，按 catch_date DESC）
// GET /api/catch-records?page&pageSize → {list,total,...}
export function getCatchRecords(params?: {
  page?: number
  pageSize?: number
}): Promise<PageResult<CatchRecord>> {
  return http.get<PageResult<CatchRecord>>('/api/catch-records', { data: params })
}

// 录入渔获（管理端）
// POST /api/admin/catch-records
// 注意：需管理员权限；普通用户无此接口
export function createCatchRecord(data: {
  userId?: string
  fishType: string
  weight: number
  remarks?: string
}): Promise<CatchRecord> {
  return http.post<CatchRecord>('/api/admin/catch-records', data)
}

// 查询本人"未支付"渔获账单（超重费用待付款）
// GET /api/catch-records/unpaid → { list: CatchBill[], total }
export function getUnpaidCatchBills(): Promise<{ list: CatchBill[]; total: number }> {
  return http.get<{ list: CatchBill[]; total: number }>('/api/catch-records/unpaid')
}
