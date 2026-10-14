export default defineAppConfig({
  pages: [
    'pages/HomePage/index',
    'pages/BookingPage/index',
    'pages/MemberPage/index',
    'pages/RedeemPage/index',
    'pages/ProfilePage/index',
    'pages/OrderListPage/index',
    'pages/OrderDetailPage/index',
    'pages/RankingPage/index',
    'pages/SafetyNoticePage/index',
    'pages/FishingRulesPage/index',
    'pages/NavigationPage/index',
    'pages/PointsPage/index',
    'pages/CatchHistoryPage/index',
    'pages/AnnounceDetailPage/index',
    'pages/SettingsPage/index',
    'pages/PrivacyPolicyPage/index',
    'pages/UserAgreementPage/index',
    'pages/ProfileInfoPage/index',
    'pages/CompleteProfilePage/index',
    'pages/RedeemCodePage/index',
    'pages/AdminDashPage/index',
    'pages/AdminCatchPage/index',
    'pages/AdminOrdersPage/index',
    'pages/AdminMembersPage/index',
    'pages/AdminAnnouncePage/index',
    'pages/AdminAnnounceFormPage/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2E7D32',
    navigationBarTitleText: '丰鱼天下',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7F4'
  },
  tabBar: {
    color: '#999',
    selectedColor: '#2E7D32',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/HomePage/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/BookingPage/index',
        text: '预约',
        iconPath: 'assets/icons/booking.png',
        selectedIconPath: 'assets/icons/booking-active.png'
      },
      {
        pagePath: 'pages/MemberPage/index',
        text: '会员',
        iconPath: 'assets/icons/member.png',
        selectedIconPath: 'assets/icons/member-active.png'
      },
      {
        pagePath: 'pages/ProfilePage/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png'
      }
    ]
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于导航到水库'
    }
  },
  lazyCodeLoading: 'requiredComponents'
})
