import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../config'
import { openLoginModal, notifyAuthChanged } from '../loginModal'

/**
 * 请求封装
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  loading?: boolean
  loadingText?: string
  /**
   * 是否携带鉴权 token（默认 true）
   * 登录/绑定手机号等公开接口设为 false：
   *  - 不自动带 token
   *  - 401 时不当作"token 过期"，而是直接暴露后端错误信息（如"微信登录失败"）
   */
  auth?: boolean
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', data, loading = false, loadingText = '加载中...', auth = true } = options

  if (loading) {
    Taro.showLoading({ title: loadingText, mask: true })
  }

  const token = Taro.getStorageSync('token')
  const header: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (auth && token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await Taro.request<ApiResponse<T>>({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header
    })

    if (loading) {
      Taro.hideLoading()
    }

    // 401 处理：区分"需鉴权接口"与"公开接口(如登录)"
    if (res.statusCode === 401) {
      if (!auth) {
        // 登录等公开接口的 401 = 业务失败（如登录 code 无效），直接暴露后端信息
        const msg = res.data?.message || '请求失败'
        throw new Error(msg)
      }
      // 鉴权接口 401 = token 过期/未登录 → 清除登录态并弹起登录弹窗
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('userInfo')
      notifyAuthChanged()
      openLoginModal()
      throw new Error('登录已过期，请重新登录')
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const body = res.data
      if (body.code === 0 || body.code === 200) {
        return body.data as T
      }
      throw new Error(body.message || '请求失败')
    }

    throw new Error(`请求失败 (${res.statusCode})`)
  } catch (err: any) {
    if (loading) {
      Taro.hideLoading()
    }
    // 网络错误时提示
    if (err.message && !err.message.includes('登录')) {
      Taro.showToast({ title: err.message || '网络错误', icon: 'none' })
    }
    throw err
  }
}

// 便捷方法
export const http = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'POST', data }),
  put: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', data }),
  del: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' })
}
