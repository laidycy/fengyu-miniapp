import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 上次登录的账号密码（用于快捷登录）
class SavedCredential {
  final String username;
  final String password;
  const SavedCredential({required this.username, required this.password});
}

/// 凭据存储：账号密码用系统级加密存储（Android Keystore / iOS Keychain），
/// 不落明文（区别于 shared_preferences）。
class CredentialStore {
  CredentialStore._();

  static const _kUser = 'fytx_login_username';
  static const _kPass = 'fytx_login_password';

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// 保存上次登录账号密码
  static Future<void> save(String username, String password) async {
    await _storage.write(key: _kUser, value: username);
    await _storage.write(key: _kPass, value: password);
  }

  /// 读取上次登录账号密码；无则返回 null
  static Future<SavedCredential?> load() async {
    try {
      final u = await _storage.read(key: _kUser);
      final p = await _storage.read(key: _kPass);
      if (u == null || u.isEmpty || p == null || p.isEmpty) return null;
      return SavedCredential(username: u, password: p);
    } catch (_) {
      return null;
    }
  }

  /// 清除（取消勾选「记住账号密码」时调用）
  static Future<void> clear() async {
    try {
      await _storage.delete(key: _kUser);
      await _storage.delete(key: _kPass);
    } catch (_) {}
  }
}
