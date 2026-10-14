import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../config.dart';
import '../nav.dart';
import 'change_password_page.dart';

/// 我的（账号信息 + 设置）
class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = api.adminUser ?? {};
    final nick = user['nickName']?.toString() ?? '管理员';
    final username = user['username']?.toString() ?? '';
    final role = user['role']?.toString() == 'super' ? '超级管理员' : '管理员';

    return Scaffold(
      backgroundColor: const Color(kBackgroundColor),
      appBar: AppBar(
        title: const Text('我的'),
        backgroundColor: const Color(kPrimaryColor),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 账号卡片
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: Color(kPrimaryColor),
                  child: Icon(Icons.admin_panel_settings,
                      color: Colors.white, size: 34),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(nick,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('账号：$username',
                          style: TextStyle(
                              fontSize: 13, color: Colors.grey.shade600)),
                      Text('角色：$role',
                          style: TextStyle(
                              fontSize: 13, color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // 设置区
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                const _SettingTile(
                    icon: Icons.cloud_outlined,
                    title: 'API 服务',
                    subtitle: 'https://YOUR-API-DOMAIN/api'),
                const Divider(height: 1, indent: 56),
                Material(
                  color: Colors.transparent,
                  child: ListTile(
                    leading: const Icon(Icons.lock_outline,
                        color: Color(kPrimaryColor)),
                    title: const Text('修改密码'),
                    subtitle: const Text('修改当前管理员登录密码',
                        style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right, size: 20),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const ChangePasswordPage()),
                    ),
                  ),
                ),
                const Divider(height: 1, indent: 56),
                Material(
                  color: Colors.transparent,
                  child: ListTile(
                    leading: const Icon(Icons.logout, color: Colors.redAccent),
                    title: const Text('退出登录',
                        style: TextStyle(color: Colors.redAccent)),
                    onTap: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('退出登录'),
                          content: const Text('确定要退出当前管理账号吗？'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('取消')),
                            TextButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('退出',
                                    style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (ok == true) AppNav.logout();
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text('丰鱼管理\n版本 $kAppVersion',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ),
        ],
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _SettingTile(
      {required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: const Color(kPrimaryColor)),
      title: Text(title),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
    );
  }
}
