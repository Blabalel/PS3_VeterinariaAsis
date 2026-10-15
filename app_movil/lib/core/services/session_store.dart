import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'session_token';
  static const _tutorIdKey = 'tutor_id';

  Future<void> save({required String token, required int tutorId}) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _tutorIdKey, value: tutorId.toString());
  }

  Future<String?> get token => _storage.read(key: _tokenKey);

  Future<int?> get tutorId async =>
      int.tryParse((await _storage.read(key: _tutorIdKey)) ?? '');

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _tutorIdKey);
  }
}
