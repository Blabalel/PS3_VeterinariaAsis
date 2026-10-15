import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_client.dart';
import '../../pacientes/data/paciente.dart';

class VaccinationCalendarScreen extends StatefulWidget {
  const VaccinationCalendarScreen({super.key, required this.patient});

  final Paciente patient;

  @override
  State<VaccinationCalendarScreen> createState() =>
      _VaccinationCalendarScreenState();
}

class _VaccinationCalendarScreenState extends State<VaccinationCalendarScreen> {
  final _api = ApiClient();
  late Future<Map<DateTime, List<_VaccinationEvent>>> _eventsFuture;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    _eventsFuture = _loadEvents();
  }

  DateTime _dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);

  Future<Map<DateTime, List<_VaccinationEvent>>> _loadEvents() async {
    await initializeDateFormatting('es_ES');
    final response = await _api.get(ApiConstants.vaccinations(widget.patient.id));
    final records = response is List
        ? response
        : response is Map && response['items'] is List
            ? response['items'] as List
            : <dynamic>[];
    final events = <DateTime, List<_VaccinationEvent>>{};
    for (final record in records.whereType<Map>()) {
      final json = Map<String, dynamic>.from(record);
      final rawDate = json['fecha_programada'] ?? json['fecha_vacunacion'] ?? json['fecha'];
      final date = rawDate == null ? null : DateTime.tryParse(rawDate.toString());
      if (date == null) continue;
      final key = _dateOnly(date);
      if (key.isBefore(_dateOnly(DateTime.now()))) continue;
      events.putIfAbsent(key, () => []).add(_VaccinationEvent(
            title: (json['nombre_vacuna'] ?? json['vacuna'] ?? json['nombre'] ?? 'Refuerzo').toString(),
            detail: (json['notas'] ?? json['descripcion'] ?? '').toString(),
          ));
    }
    return events;
  }

  List<_VaccinationEvent> _eventsForDay(Map<DateTime, List<_VaccinationEvent>> events, DateTime day) =>
      events[_dateOnly(day)] ?? const [];

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('Vacunas · ${widget.patient.nombre}')),
        body: FutureBuilder<Map<DateTime, List<_VaccinationEvent>>>(
          future: _eventsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.event_busy_outlined, size: 42),
                  const SizedBox(height: 10),
                  const Text('No se pudo cargar el calendario de vacunación', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(snapshot.error.toString(), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: () => setState(() => _eventsFuture = _loadEvents()), child: const Text('Reintentar')),
                ]),
              ));
            }

            final events = snapshot.data ?? {};
            final selectedEvents = _eventsForDay(events, _selectedDay);
            return Column(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                child: TableCalendar<_VaccinationEvent>(
                  locale: 'es_ES',
                  firstDay: DateTime.utc(DateTime.now().year - 2, 1, 1),
                  lastDay: DateTime.utc(DateTime.now().year + 5, 12, 31),
                  focusedDay: _focusedDay,
                  selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                  eventLoader: (day) => _eventsForDay(events, day),
                  calendarFormat: CalendarFormat.month,
                  startingDayOfWeek: StartingDayOfWeek.monday,
                  onDaySelected: (selected, focused) => setState(() {
                    _selectedDay = selected;
                    _focusedDay = focused;
                  }),
                  onPageChanged: (focused) => _focusedDay = focused,
                  calendarStyle: const CalendarStyle(
                    todayDecoration: BoxDecoration(color: Color(0xFFB8CFBC), shape: BoxShape.circle),
                    selectedDecoration: BoxDecoration(color: Color(0xFF32694D), shape: BoxShape.circle),
                    markerDecoration: BoxDecoration(color: Color(0xFFD79B39), shape: BoxShape.circle),
                    outsideDaysVisible: false,
                  ),
                  headerStyle: const HeaderStyle(formatButtonVisible: false, titleCentered: true),
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Row(children: [
                  Expanded(child: Text('Refuerzos · ${_formatDate(_selectedDay)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                  Text('${events.values.fold<int>(0, (sum, items) => sum + items.length)} programados', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                ]),
              ),
              Expanded(
                child: selectedEvents.isEmpty
                    ? Center(child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.event_available_outlined, size: 38, color: Colors.black38),
                          const SizedBox(height: 8),
                          Text('No hay refuerzos para ${_formatDate(_selectedDay)}.', textAlign: TextAlign.center),
                        ]),
                      ))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 2, 16, 20),
                        itemCount: selectedEvents.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) => Card(child: ListTile(
                          leading: const CircleAvatar(backgroundColor: Color(0xFFEAF2EB), child: Icon(Icons.vaccines_outlined, color: Color(0xFF32694D))),
                          title: Text(selectedEvents[index].title, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: selectedEvents[index].detail.isEmpty ? null : Text(selectedEvents[index].detail),
                        )),
                      ),
              ),
            ]);
          },
        ),
      );

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}

class _VaccinationEvent {
  const _VaccinationEvent({required this.title, required this.detail});
  final String title;
  final String detail;
}
