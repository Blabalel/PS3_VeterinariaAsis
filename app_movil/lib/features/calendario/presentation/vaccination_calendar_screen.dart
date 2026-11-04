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
  late Future< Map< DateTime, List< _VaccinationEvent > > > _eventsFuture;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    _eventsFuture = _loadEvents();
  }

  DateTime _dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);

  Future< Map< DateTime, List< _VaccinationEvent > > > _loadEvents() async {
    await initializeDateFormatting('es_ES');
    final response = await _api.get(ApiConstants.vaccinations(widget.patient.id));
    
    final records = response is List
        ? response
        : response is Map && response['items'] is List
            ? response['items'] as List
            : <dynamic>[];
            
    final events = <DateTime, List<_VaccinationEvent>>{};
    final today = _dateOnly(DateTime.now());

    for (final record in records.whereType()) {
      final json = Map<String, dynamic>.from(record);
      final rawDate = json['fecha_programada'] ?? json['fecha_vacunacion'] ?? json['fecha'];
      final date = rawDate == null ? null : DateTime.tryParse(rawDate.toString());
      if (date == null) continue;
      
      final key = _dateOnly(date);
      
      String estado = (json['estado'] ?? '').toString().toLowerCase();
      if (estado != 'aplicada') {
        estado = key.isBefore(today) ? 'vencida' : 'programada';
      }

      events.putIfAbsent(key, () => []).add(_VaccinationEvent(
            title: (json['nombre_vacuna'] ?? json['vacuna'] ?? json['nombre'] ?? 'Refuerzo').toString(),
            detail: (json['notas'] ?? json['descripcion'] ?? '').toString(),
            estado: estado,
          ));
    }
    return events;
  }

  List<_VaccinationEvent> _eventsForDay(Map<DateTime, List<_VaccinationEvent>> events, DateTime day) =>
      events[_dateOnly(day)] ?? const [];

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('Vacunas · ${widget.patient.nombre}')),
        body: FutureBuilder< Map< DateTime, List< _VaccinationEvent > > >(
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
                  const Text('No se pudo cargar el calendario', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700)),
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
              _buildLegend(),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
                child: TableCalendar<_VaccinationEvent>(
                  locale: 'es_ES',
                  firstDay: DateTime.utc(DateTime.now().year - 5, 1, 1),
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
                    outsideDaysVisible: false,
                  ),
                  headerStyle: const HeaderStyle(formatButtonVisible: false, titleCentered: true),
                  calendarBuilders: CalendarBuilders(
                    markerBuilder: (context, date, dayEvents) {
                      if (dayEvents.isEmpty) return const SizedBox();
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: dayEvents.map((event) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 1.5),
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: event.color,
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Row(children: [
                  Expanded(child: Text('Registros · ${_formatDate(_selectedDay)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                  Text('${selectedEvents.length} eventos', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                ]),
              ),
              Expanded(
                child: selectedEvents.isEmpty
                    ? Center(child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.event_available_outlined, size: 38, color: Colors.black38),
                          const SizedBox(height: 8),
                          Text('No hay registros para ${_formatDate(_selectedDay)}.', textAlign: TextAlign.center),
                        ]),
                      ))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 2, 16, 20),
                        itemCount: selectedEvents.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final event = selectedEvents[index];
                          return Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: event.color.withOpacity(0.3)),
                            ),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: event.color.withOpacity(0.12), 
                                child: Icon(Icons.vaccines_outlined, color: event.color)
                              ),
                              title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: event.detail.isEmpty ? null : Text(event.detail),
                              trailing: _statusChip(event),
                            )
                          );
                        },
                      ),
              ),
            ]);
          },
        ),
      );

  Widget _buildLegend() => Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _legendItem(const Color(0xFF4E875F), 'Aplicada'),
            const SizedBox(width: 16),
            _legendItem(const Color(0xFFD79B39), 'Próxima'),
            const SizedBox(width: 16),
            _legendItem(const Color(0xFFCA5C4A), 'Vencida'),
          ],
        ),
      );

  Widget _legendItem(Color color, String label) => Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black87)),
        ],
      );

  Widget _statusChip(_VaccinationEvent event) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: event.color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          event.estado.toUpperCase(),
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: event.color),
        ),
      );

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}

class _VaccinationEvent {
  const _VaccinationEvent({required this.title, required this.detail, required this.estado});
  final String title;
  final String detail;
  final String estado;

  Color get color {
    switch (estado) {
      case 'aplicada': return const Color(0xFF4E875F); // Verde
      case 'vencida': return const Color(0xFFCA5C4A); // Rojo
      default: return const Color(0xFFD79B39); // Ámbar (programada)
    }
  }
}