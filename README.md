# 丰鱼天下 · 微信小程序（C 端预约端）

水库/钓场垂钓预约小程序：预约钓位、渔获结算、会员体系、渔具租赁登记。

技术栈：**Taro 4 + React 18 + TypeScript**（编译为微信小程序）。

> 本仓库已脱敏：域名 / 微信 AppID / 客服电话均已替换为占位符，见下方「部署前需替换的位置」。

## 快速开始

```bash
npm install
npm run dev:weapp        # 开发（微信开发者工具导入本目录，dist/ 为产物目录）
npm run build:weapp      # 生产构建
```

微信开发者工具导入时，`project.config.json` 的 `appid` 需改成你自己在微信公众平台申请的小程序 AppID。

## 部署前需替换的位置

| 文件 | 占位符 | 替换为 |
|---|---|---|
| `src/utils/config.ts` | `YOUR-API-DOMAIN` | 后端 API 域名（不含 `/api` 前缀，各接口路径自带 `/api`） |
| `src/utils/config.ts` | `wx0000000000000000` | 你的小程序 AppID |
| `project.config.json` | `wx0000000000000000` | 同上（微信开发者工具用） |
| `src/pages/BookingPage/index.tsx`、`src/pages/ProfilePage/index.tsx` 等 | `13800000000` | 你的客服电话号码 |

另外 `src/utils/config.ts` 里的 `RESERVOIR_LOCATION`（水库坐标/地址/简介）为示例业务数据，按实际钓场修改。

## 目录结构

```
src/
  pages/          页面（预约、订单、渔获、会员、管理端内嵌页等）
  components/     通用组件
  utils/          请求封装、登录、API 模块、全局配置(config.ts)
  hooks/          自定义 hooks
  styles/         全局样式
  assets/         图片资源
config/           Taro 构建配置
```

## 后端接口约定

- 请求路径统一带 `/api` 前缀（`API_BASE_URL` 不含 `/api`）
- 登录：`wx.login()` 取 code → 后端换 openid/token（静默登录，不弹窗）

## License

MIT
