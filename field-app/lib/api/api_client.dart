/// 轻量 HTTP 客户端封装（基于 dart:io + http 包），管理 admin token。
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../nav.dart';

/// API 统一异常
class ApiException implements Exception {
  final String message;
  final int? code;
  ApiException(this.message, {this.code});
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  /// 单次请求超时（避免网络"半死"时界面卡死）
  static const Duration _timeout = Duration(seconds: 15);

  String? _token;
  Map<String, dynamic>? _adminUser;

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;
  String? get adminName =>
      _adminUser?['nickName'] ?? _adminUser?['username'] ?? '管理员';
  Map<String, dynamic>? get adminUser => _adminUser;

  /// 请求头
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  /// 读取本地保存的登录态
  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(kTokenKey);
    final userJson = prefs.getString(kAdminUserKey);
    if (userJson != null) {
      try {
        _adminUser = jsonDecode(userJson) as Map<String, dynamic>;
      } catch (_) {
        _adminUser = null;
      }
    }
  }

  /// 登录
  Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await _request(
      'POST',
      '$kAdminPrefix/login',
      body: {'username': username, 'password': password},
      needAuth: false,
    );
    _token = res['token'] as String?;
    _adminUser = (res['user'] as Map<String, dynamic>?) ?? {};
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kTokenKey, _token ?? '');
    await prefs.setString(kAdminUserKey, jsonEncode(_adminUser));
    return res;
  }

  /// 退出登录
  Future<void> logout() async {
    _token = null;
    _adminUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kTokenKey);
    await prefs.remove(kAdminUserKey);
  }

  /// GET
  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    return _request('GET', path, query: query);
  }

  /// POST
  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    return _request('POST', path, body: body);
  }

  /// PUT
  Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    return _request('PUT', path, body: body);
  }

  /// DELETE
  Future<dynamic> delete(String path) async {
    return _request('DELETE', path);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool needAuth = true,
  }) async {
    if (needAuth && !isLoggedIn) {
      throw ApiException('未登录，请先登录');
    }
    final uri = Uri.parse('$kApiBase$path').replace(
      queryParameters: query?.isEmpty ?? true ? null : query,
    );
    late http.Response res;
    try {
      switch (method) {
        case 'GET':
          res = await http.get(uri, headers: _headers).timeout(_timeout);
          break;
        case 'POST':
          res = await http
              .post(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(_timeout);
          break;
        case 'PUT':
          res = await http
              .put(uri, headers: _headers, body: jsonEncode(body ?? {}))
              .timeout(_timeout);
          break;
        case 'DELETE':
          res = await http.delete(uri, headers: _headers).timeout(_timeout);
          break;
        default:
          throw ApiException('不支持的请求方法: $method');
      }
    } on SocketException {
      throw ApiException('网络连接失败，请检查网络或服务器');
    } on TimeoutException {
      throw ApiException('请求超时，请稍后重试');
    } on http.ClientException {
      throw ApiException('网络请求失败');
    }

    Map<String, dynamic> json;
    try {
      json = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('服务器返回异常 (HTTP ${res.statusCode})');
    }

    final code = json['code'];
    if (code == 0) {
      return json['data'];
    }
    // 401：鉴权接口 = token 过期 → 清登录态并触发切回登录页；公开接口(如登录) = 业务失败，暴露后端信息
    if (code == 401) {
      if (needAuth) {
        await logout();
        AppNav.logout();
        throw ApiException('登录已过期，请重新登录', code: 401);
      }
      throw ApiException(json['message']?.toString() ?? '请求失败', code: 401);
    }
    throw ApiException(json['message']?.toString() ?? '请求失败', code: code is int ? code : null);
  }
}

/// 快捷访问
ApiClient get api => ApiClient.instance;
