import 'package:flutter/material.dart';

import '../config.dart';
import '../nav.dart';
import 'home_page.dart';
import 'member_page.dart';
import 'order_page.dart';
import 'catch_entry_page.dart';
import 'profile_page.dart';

/// 主框架：底部导航容器
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  static const _pages = <Widget>[
    HomePage(),
    CatchEntryPage(),
    OrderPage(),
    MemberPage(),
    ProfilePage(),
  ];

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: NavTabBuilder(
        builder: (_, index) =>
            IndexedStack(index: index, children: _pages),
      ),
      bottomNavigationBar: NavTabBuilder(
        builder: (_, index) => BottomNavigationBar(
          currentIndex: index,
          onTap: (i) => AppNav.switchTab(i),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(kPrimaryColor),
          unselectedItemColor: Colors.grey.shade500,
          items: const [
            BottomNavigationBarItem(
                icon: Icon(Icons.dashboard_outlined),
                activeIcon: Icon(Icons.dashboard),
                label: '工作台'),
            BottomNavigationBarItem(
                icon: Icon(Icons.phishing_outlined),
                activeIcon: Icon(Icons.phishing),
                label: '渔获录入'),
            BottomNavigationBarItem(
                icon: Icon(Icons.receipt_long_outlined),
                activeIcon: Icon(Icons.receipt_long),
                label: '订单'),
            BottomNavigationBarItem(
                icon: Icon(Icons.group_outlined),
                activeIcon: Icon(Icons.group),
                label: '会员'),
            BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: '我的'),
          ],
        ),
      ),
    );
  }
}
