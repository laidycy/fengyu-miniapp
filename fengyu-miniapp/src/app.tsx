import { PropsWithChildren } from 'react'
import Taro, { useLaunch, useError } from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('丰鱼天下 App launched.')
    // 冷启动由分享链接进入时捕获邀请码，供落地页(首页)兜底读取（tabBar 页 onLoad 拿 query 可能不稳）
    try {
      const launch = Taro.getLaunchOptionsSync()
      const inviteCode = (launch?.query as any)?.inviteCode
      if (inviteCode) {
        Taro.setStorageSync('__launchInviteCode', String(inviteCode))
      }
    } catch {
      /* ignore */
    }
  })

  // children 是将要会渲染的页面（登录弹窗由各页面用 useLoginModal 自行渲染，见 hooks/useLoginModal.ts）
  return children
}

export default App
