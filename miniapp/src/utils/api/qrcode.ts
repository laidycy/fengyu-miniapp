import { http } from './request'

/**
 * 二维码 API —— 对齐正式版后端 /api/qrcode
 */

// 获取订单核销二维码（base64，小程序用这个）
// GET /api/qrcode/:orderId/base64 → { qrcode(dataURL), bookingCode }
export function getOrderQrCode(orderId: string): Promise<{
  qrcode: string
  bookingCode: string
}> {
  return http.get(`/api/qrcode/${orderId}/base64`)
}

// 获取二维码 PNG（核销扫码，管理端用）
// GET /api/qrcode/:orderId → PNG 图片
export function getQrCodePng(orderId: string): Promise<unknown> {
  return http.get(`/api/qrcode/${orderId}`)
}
