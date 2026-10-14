import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'api/api_client.dart';
import 'config.dart';
import 'nav.dart';
import 'screens/login_page.dart';
import 'screens/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 恢复本地登录态
  await api.loadFromStorage();
  runApp(const FytxApp());
}

class FytxApp extends StatelessWidget {
  const FytxApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '丰鱼管理',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(kPrimaryColor),
          primary: const Color(kPrimaryColor),
        ),
        scaffoldBackgroundColor: const Color(kBackgroundColor),
        useMaterial3: true,
      ),
      // 中文支持（日期选择器/组件文案）
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('zh', 'CN'), Locale('en')],
      locale: const Locale('zh', 'CN'),
      home: const RootGate(),
    );
  }
}

/// 根路由：根据登录态 + 登出信号切换 LoginPage / MainShell
class RootGate extends StatefulWidget {
  const RootGate({super.key});

  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  bool _loggedIn = api.isLoggedIn;

  @override
  void initState() {
    super.initState();
    AppNav.logoutSignal.addListener(_onLogout);
  }

  @override
  void dispose() {
    AppNav.logoutSignal.removeListener(_onLogout);
    super.dispose();
  }

  Future<void> _onLogout() async {
    await api.logout();
    if (mounted) setState(() => _loggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return _loggedIn ? const MainShell() : LoginPage(onLoginSuccess: _onLogin);
  }

  void _onLogin() {
    setState(() => _loggedIn = true);
  }
}
