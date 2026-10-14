// 页面级登录 Hook —— 弹窗渲染 + 登录态跨页面同步
//
// 一、登录弹窗渲染（可靠方案）
// 微信小程序端 App 里渲染的自定义组件不会作为覆盖层出现在每个页面之上，
// 所以每个需要登录的页面用本 Hook 自行渲染 PhoneLoginModal。
// - 页面是渲染容器，弹窗一定在当前页面顶层，真机可靠
// - 工具函数（requireLogin / request.ts 401）可调 openLoginModal() 全局触发，
//   当前激活页面订阅到事件后弹出
//
// 二、登录态跨页面同步
// 登录(setToken)/退出(clearAuth)时会广播 AUTH_CHANGED 事件，
// 本 Hook 订阅该事件并递增 authVersion。页面把 authVersion 纳入 useEffect 依赖，
// 即可在任何页面登录/退出后自动刷新自身数据与登录状态。
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import PhoneLoginModal from '../components/PhoneLoginModal'
import { LOGIN_MODAL_OPEN, LOGIN_MODAL_CLOSE, AUTH_CHANGED, closeLoginModal } from '../utils/loginModal'

type SuccessCb = () => void

export interface UseLoginModal {
  /** 弹窗是否显示 */
  showLogin: boolean
  /** 打开弹窗（可在页面内直接调用，也可依赖 openLoginModal()） */
  openLogin: (onSuccess?: SuccessCb) => void
  /** 关闭弹窗 */
  closeLogin: () => void
  /** 登录态版本号：登录/退出/绑号时递增，用于页面 useEffect 依赖触发刷新 */
  authVersion: number
  /** 当前是否已登录（实时读取 storage） */
  isAuthed: boolean
  /** 缓存的用户信息（实时读取 storage） */
  userInfo: any
  /** 在页面 JSX 中渲染一次即可：{login.renderLogin} */
  renderLogin: React.ReactElement
}

export function useLoginModal(onSuccess?: SuccessCb): UseLoginModal {
  const [showLogin, setShowLogin] = useState(false)
  const [authVersion, setAuthVersion] = useState(0)
  const successRef = useRef<SuccessCb | undefined>(onSuccess)

  const openLogin = (cb?: SuccessCb) => {
    successRef.current = cb || onSuccess
    setShowLogin(true)
  }
  const closeLogin = () => {
    successRef.current = undefined
    setShowLogin(false)
  }

  useEffect(() => {
    // 全局登录弹窗事件（供 requireLogin / request.ts 401 等工具函数触发）
    const onOpen = (cb?: SuccessCb) => {
      successRef.current = cb || onSuccess
      setShowLogin(true)
    }
    const onClose = () => setShowLogin(false)
    // 登录态变化（登录/退出/绑号）→ 递增版本号，触发页面刷新
    const onAuthChanged = () => setAuthVersion(v => v + 1)

    Taro.eventCenter.on(LOGIN_MODAL_OPEN, onOpen)
    Taro.eventCenter.on(LOGIN_MODAL_CLOSE, onClose)
    Taro.eventCenter.on(AUTH_CHANGED, onAuthChanged)

    return () => {
      Taro.eventCenter.off(LOGIN_MODAL_OPEN, onOpen)
      Taro.eventCenter.off(LOGIN_MODAL_CLOSE, onClose)
      Taro.eventCenter.off(AUTH_CHANGED, onAuthChanged)
    }
  }, [])

  const handleSuccess = () => {
    const cb = successRef.current
    successRef.current = undefined
    setShowLogin(false)
    cb?.()
  }

  const renderLogin = (
    <PhoneLoginModal
      visible={showLogin}
      onClose={() => {
        // 用户主动关闭（暂不登录）→ 记录冷却，避免同一会话内反复自动弹出
        closeLoginModal(true)
        successRef.current = undefined
        setShowLogin(false)
      }}
      onSuccess={handleSuccess}
    />
  )

  return {
    showLogin,
    openLogin,
    closeLogin,
    authVersion,
    isAuthed: !!Taro.getStorageSync('token'),
    userInfo: Taro.getStorageSync('userInfo') || null,
    renderLogin,
  }
}
