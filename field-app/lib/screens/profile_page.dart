import 'dart:io';

import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../config.dart';
import '../nav.dart';
import '../services/update_service.dart';
import 'change_password_page.dart';

/// 我的（账号信息 + 设置 + App 内更新）
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _checking = false;
  bool _downloading = false;
  String _dlNote = '';
  int _dlReceived = 0;
  int _dlTotal = -1;
  bool _cancelled = false;
  File? _lastFile;

  void _snack(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  /// 检查更新 → 确认 → 进度弹窗内下载 → 拉起系统安装
  Future<void> _startUpdateFlow() async {
    if (_checking || _downloading) return;
    setState(() {
      _checking = true;
      _cancelled = false;
    });
    RemoteVersion? remote;
    try {
      remote = await UpdateService.instance.checkUpdate();
    } catch (e) {
      if (mounted) _snack('检查更新失败：$e');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
    if (!mounted) return;
    if (remote == null) {
      _snack('当前已是最新版本 $kAppVersion');
      return;
    }
    final rv = remote; // 非空提升：后续闭包统一用 rv

    // 1) 确认弹窗（新版本号 + 更新说明）
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('发现新版本 ${rv.versionName}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (rv.note.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(rv.note,
                    style: const TextStyle(fontSize: 13, height: 1.5)),
              ),
            const Text('包体约 55 MB，建议 Wi-Fi 环境下载',
                style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('以后再说')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('立即更新')),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    // 2) 进度弹窗：打开后后台下载，弹窗内实时刷新；
    //    下载完成/失败/取消由 _doDownload 关闭弹窗（Navigator.pop(page ctx) 弹掉最上层）
    final done = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && !_downloading) _doDownload(rv);
        });
        return StatefulBuilder(
          builder: (ctx2, setDlg) => AlertDialog(
            title: const Text('正在更新 App'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    minHeight: 8,
                    value: _dlTotal > 0 ? _dlReceived / _dlTotal : null,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _dlTotal > 0
                      ? '${(_dlReceived / 1048576).toStringAsFixed(1)} / '
                          '${(_dlTotal / 1048576).toStringAsFixed(1)} MB'
                      : '${(_dlReceived / 1048576).toStringAsFixed(1)} MB',
                  style: TextStyle(
                      fontSize: 13, color: Colors.grey.shade700),
                ),
                if (_dlNote.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(_dlNote,
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade500)),
                  ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: _downloading
                    ? () {
                        // 置取消标志，下载循环检测到后自行收尾
                        setState(() => _cancelled = true);
                        setDlg(() => _dlNote = '正在取消…');
                      }
                    : null,
                child: const Text('取消'),
              ),
            ],
          ),
        );
      },
    );

    if (!mounted) return;
    final file = _lastFile;
    _lastFile = null;
    if (done == true && file != null) {
      // 3) 拉起系统安装；失败则降级到浏览器下载页
      final launched = await UpdateService.instance.install(file);
      if (!launched) {
        _snack('无法直接拉起安装，已打开下载页，请手动安装');
        await UpdateService.instance.openInBrowser(rv.url);
      }
      try {
        if (file.existsSync()) file.deleteSync();
      } catch (_) {}
    }
  }

  /// 实际执行下载（进度弹窗打开后调用）
  Future<void> _doDownload(RemoteVersion remote) async {
    setState(() {
      _downloading = true;
      _dlReceived = 0;
      _dlTotal = -1;
      _dlNote = '';
    });
    try {
      final file = await UpdateService.instance.downloadApk(
        remote.url,
        onProgress: (received, total) {
          if (!mounted || !_downloading) return;
          setState(() {
            _dlReceived = received;
            if (total > 0) _dlTotal = total;
          });
        },
        shouldCancel: () => _cancelled,
      );
      if (!mounted) return;
      setState(() {
        _downloading = false;
        _dlNote = '下载完成，正在打开安装…';
        _lastFile = file;
      });
      await Future.delayed(const Duration(milliseconds: 600));
      if (mounted) Navigator.pop(context, true);
    } on DownloadCancelled {
      if (mounted) {
        setState(() => _downloading = false);
        Navigator.pop(context, false);
        _snack('已取消下载');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _downloading = false);
        Navigator.pop(context, false);
        _snack('下载失败：$e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = api.adminUser ?? {};
    final nick = user['nickName']?.toString() ?? '管理员';
    final username = user['username']?.toString() ?? '';
    final role = user['role']?.toString() == 'super' ? '超级管理员' : '管理员';
    final busy = _checking || _downloading;

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
                    leading: busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child:
                                CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.system_update_alt,
                            color: Color(kPrimaryColor)),
                    title: const Text('检查 App 更新'),
                    subtitle: Text(
                        _downloading
                            ? _dlNote.isNotEmpty
                                ? _dlNote
                                : '正在下载更新…'
                            : '当前版本 $kAppVersion',
                        style: const TextStyle(fontSize: 12)),
                    trailing: busy
                        ? null
                        : const Icon(Icons.chevron_right, size: 20),
                    onTap: busy ? null : _startUpdateFlow,
                  ),
                ),
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
