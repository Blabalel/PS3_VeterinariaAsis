class ApiConstants {
  ApiConstants._();

  /// Override for local/network environments:
  /// flutter run --dart-define=API_BASE_URL=https://your-tunnel.ngrok-free.dev
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://crunching-starting-glacial.ngrok-free.dev',
  );

  static const String login = '/api/auth/login';
  static const String patients = '/api/pacientes/';
  static const String triage = '/api/historial/triaje';

  static String vaccinations(int patientId) =>
      '/api/vacunacion/paciente/$patientId';
}
