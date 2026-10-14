import 'package:flutter/material.dart';

/// 全局导航控制：负责底部 tab 切换与登出，供任意页面调用。
class AppNav {
  AppNav._();

  /// 当前 tab 索引
  static final ValueNotifier<int> tabIndex = ValueNotifier<int>(0);

  /// 登出信号（触发 main 切回登录页）
  static final ValueNotifier<int> logoutSignal = ValueNotifier<int>(0);

  static void switchTab(int i) => tabIndex.value = i;

  static void logout() => logoutSignal.value++;
}

/// 可监听 tabIndex 的便捷组件（供 MainShell 使用）
class NavTabBuilder extends StatelessWidget {
  final Widget Function(BuildContext, int) builder;
  const NavTabBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: AppNav.tabIndex,
      builder: (context, index, _) => builder(context, index),
    );
  }
}
