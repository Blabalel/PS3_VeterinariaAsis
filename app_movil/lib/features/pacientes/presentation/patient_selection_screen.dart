import 'package:flutter/material.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_client.dart';
import '../../../core/services/session_store.dart';
import '../../auth/presentation/login_screen.dart';
import '../../calendario/presentation/vaccination_calendar_screen.dart';
import '../../triaje/presentation/triage_screen.dart';
import '../data/paciente.dart';

class PatientSelectionScreen extends StatefulWidget {
  const PatientSelectionScreen({super.key, required this.tutorId});

  final int tutorId;

  @override
  State<PatientSelectionScreen> createState() =>
      _PatientSelectionScreenState();
}

class _PatientSelectionScreenState extends State<PatientSelectionScreen> {
  final _api = ApiClient();
  late Future<List<Paciente>> _patients;

  @override
  void initState() {
    super.initState();
    _patients = _loadPatients();
  }

  Future<List<Paciente>> _loadPatients() async {
    final result = await _api.get(
      ApiConstants.patients,
      query: {'tutor_id': widget.tutorId.toString(), 'skip': '0', 'limit': '200'},
    );
    if (result is! List) throw const FormatException('Respuesta de pacientes inválida.');
    return result.whereType<Map>().map((rawPatient) {
      final patient = Map<String, dynamic>.from(rawPatient);
      final ownerId = int.tryParse(patient['tutor_id'].toString());
      return (ownerId == widget.tutorId) ? Paciente.fromJson(patient) : null;
    }).whereType<Paciente>().toList();
  }

  void _openTriage(Paciente patient) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => TriageScreen(patient: patient),
    ));
  }

  void _openCalendar(Paciente patient) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => VaccinationCalendarScreen(patient: patient),
    ));
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Quieres salir de tu cuenta?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salir')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    // Clear credentials before returning to the login screen.
    await SessionStore().clear();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Mis mascotas'),
          actions: [IconButton(onPressed: _logout, tooltip: 'Cerrar sesión', icon: const Icon(Icons.logout))],
        ),
        body: FutureBuilder<List<Paciente>>(
          future: _patients,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _LoadError(message: snapshot.error.toString(), onRetry: () => setState(() => _patients = _loadPatients()));
            }
            final patients = snapshot.data ?? const <Paciente>[];
            if (patients.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.pets, size: 52, color: Colors.black38),
                    SizedBox(height: 14),
                    Text('Todavía no tienes mascotas registradas', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600)),
                    SizedBox(height: 6),
                    Text('Pide a la clínica que vincule tus pacientes a tu cuenta.', textAlign: TextAlign.center),
                  ]),
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => setState(() => _patients = _loadPatients()),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
                children: [
                  Text('Selecciona una mascota', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text('Inicia un triaje o consulta su calendario de vacunación.', style: TextStyle(color: Colors.grey.shade600)),
                  const SizedBox(height: 16),
                  ...patients.map((patient) => Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(15),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              const CircleAvatar(child: Icon(Icons.pets)),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(patient.nombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                                Text([patient.especie, patient.raza].whereType<String>().where((item) => item.isNotEmpty).join(' · '), style: TextStyle(color: Colors.grey.shade600)),
                              ])),
                              IconButton(tooltip: 'Calendario de vacunas', onPressed: () => _openCalendar(patient), icon: const Icon(Icons.calendar_month_outlined)),
                            ]),
                            const SizedBox(height: 13),
                            SizedBox(width: double.infinity, child: FilledButton.icon(
                              onPressed: () => _openTriage(patient),
                              icon: const Icon(Icons.health_and_safety_outlined),
                              label: const Text('Iniciar cuestionario de triaje'),
                            )),
                          ]),
                        ),
                      )),
                ],
              ),
            );
          },
        ),
      );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(26),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_outlined, size: 44),
            const SizedBox(height: 10),
            const Text('No se pudieron cargar tus mascotas', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
          ]),
        ),
      );
}
