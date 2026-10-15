import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import 'session_store.dart';

class ApiClient {
  ApiClient({http.Client? client, SessionStore? sessionStore})
      : _client = client ?? http.Client(),
        _sessionStore = sessionStore ?? SessionStore();

  final http.Client _client;
  final SessionStore _sessionStore;

  Uri uri(String path, [Map<String, String>? query]) =>
      Uri.parse('${ApiConstants.baseUrl}$path').replace(queryParameters: query);

  Future<Map<String, String>> headers({bool authenticated = true}) async {
    final result = <String, String>{'Accept': 'application/json'};
    if (authenticated) {
      final token = await _sessionStore.token;
      if (token != null && token.isNotEmpty) {
        result['Authorization'] = 'Bearer $token';
      }
    }
    return result;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final response = await _client
        .get(uri(path, query), headers: await headers())
        .timeout(const Duration(seconds: 20));
    return _decode(response);
  }

  Future<dynamic> postJson(String path, Map<String, dynamic> body,
      {bool authenticated = true}) async {
    final requestHeaders = await headers(authenticated: authenticated);
    requestHeaders['Content-Type'] = 'application/json';
    final response = await _client
        .post(uri(path), headers: requestHeaders, body: jsonEncode(body))
        .timeout(const Duration(seconds: 30));
    return _decode(response);
  }

  Future<dynamic> postMultipart(
    String path, {
    required Map<String, String> fields,
    required String filePath,
    required String fileField,
  }) async {
    final request = http.MultipartRequest('POST', uri(path));
    request.headers.addAll(await headers());
    request.fields.addAll(fields);
    request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
    final streamed = await _client.send(request).timeout(
          const Duration(seconds: 45),
        );
    return _decode(await http.Response.fromStream(streamed));
  }

  dynamic _decode(http.Response response) {
    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final detail = decoded is Map ? decoded['detail'] : null;
      throw ApiException(
        detail?.toString() ?? 'Error del servidor (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }
    return decoded;
  }
}

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
