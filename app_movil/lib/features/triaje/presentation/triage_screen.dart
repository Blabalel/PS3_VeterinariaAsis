import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_client.dart';
import '../../pacientes/data/paciente.dart';

class TriageScreen extends StatefulWidget {
  const TriageScreen({super.key, required this.patient});

  final Paciente patient;

  @override
  State<TriageScreen> createState() => _TriageScreenState();
}

class _TriageScreenState extends State<TriageScreen> {
  final _formKey = GlobalKey<FormState>();
  final _temperatureController = TextEditingController();
  final _observationsController = TextEditingController();
  final _picker = ImagePicker();
  final _api = ApiClient();

  bool? _activeBleeding;
  String? _appetite;
  String? _activity;
  bool? _painOnTouch;
  XFile? _photo;
  bool _submitting = false;

  @override
  void dispose() {
    _temperatureController.dispose();
    _observationsController.dispose();
    super.dispose();
  }

  Future<void> _choosePhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.camera_alt_outlined), title: const Text('Tomar fotografía'), onTap: () => Navigator.pop(context, ImageSource.camera)),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Elegir de galería'), onTap: () => Navigator.pop(context, ImageSource.gallery)),
        ]),
      ),
    );
    if (source == null) return;
    final image = await _picker.pickImage(source: source, imageQuality: 82, maxWidth: 1800);
    if (image != null && mounted) setState(() => _photo = image);
  }

  Map<String, dynamic> _answers() => {
        'sangrado_activo': _activeBleeding,
        'apetito': _appetite,
        'actividad': _activity,
        'temperatura_c': _temperatureController.text.trim().isEmpty
            ? null
            : double.tryParse(_temperatureController.text.trim().replaceAll(',', '.')),
        'dolor_al_tacto': _painOnTouch,
        'observaciones': _observationsController.text.trim(),
      };

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_activeBleeding == null ||
        _appetite == null ||
        _activity == null ||
        _painOnTouch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Responde las preguntas 1 a 4 para continuar.')),
      );
      return;
    }
    setState(() => _submitting = true);
    final answers = _answers();
    final reason = _observationsController.text.trim().isEmpty
        ? 'Cuestionario de triaje de ${widget.patient.nombre}'
        : _observationsController.text.trim();
    try {
      final dynamic result;
      if (_photo == null) {
        result = await _api.postJson(ApiConstants.triage, {
          'paciente_id': widget.patient.id,
          'respuestas': answers,
          'motivo': reason,
        });
      } else {
        result = await _api.postMultipart(
          ApiConstants.triage,
          fields: {
            'paciente_id': widget.patient.id.toString(),
            'respuestas': jsonEncode(answers),
            'motivo': reason,
          },
          filePath: _photo!.path,
          fileField: 'foto',
        );
      }
      if (!mounted) return;
      final response = result is Map ? result : <String, dynamic>{};
      final severity = response['nivel_gravedad']?.toString() ??
          response['gravedad']?.toString() ??
          'pendiente';
      final score = response['puntaje_riesgo']?.toString();
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle_outline, color: Color(0xFF39734F), size: 38),
          title: const Text('Caso enviado'),
          content: Text(
            'El reporte de ${widget.patient.nombre} fue enviado al equipo veterinario.\n\n'
            'Nivel de riesgo preliminar: ${_severityLabel(severity)}'
            '${score == null ? '' : '\nPuntaje: $score'}\n\n'
            'Este resultado sirve para priorizar la revisión y no reemplaza la evaluación del veterinario.',
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Entendido'))],
        ),
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo enviar el triaje: $error')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _severityLabel(String severity) => switch (severity.toLowerCase()) {
        'critica' || 'crítica' => 'Crítico',
        'moderada' => 'Moderado',
        'leve' => 'Leve',
        _ => 'Pendiente de cálculo',
      };

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('Triaje · ${widget.patient.nombre}')),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 30),
            children: [
              _intro(context),
              const SizedBox(height: 16),
              _QuestionCard(
                number: '1', title: '¿Hay sangrado activo?',
                child: _yesNo(value: _activeBleeding, onChanged: (value) => setState(() => _activeBleeding = value)),
              ),
              _QuestionCard(
                number: '2', title: '¿Cómo está su apetito?',
                child: _choiceGroup<String>(
                  value: _appetite,
                  values: const {'normal': 'Come normalmente', 'reducido': 'Come menos de lo habitual', 'no_come': 'No come nada'},
                  onChanged: (value) => setState(() => _appetite = value),
                ),
              ),
              _QuestionCard(
                number: '3', title: '¿Cuál es su nivel de actividad?',
                child: _choiceGroup<String>(
                  value: _activity,
                  values: const {'activo': 'Activo', 'aletargado': 'Aletargado', 'inmovil': 'Inmóvil'},
                  onChanged: (value) => setState(() => _activity = value),
                ),
              ),
              _QuestionCard(
                number: '4', title: 'Temperatura estimada y sensibilidad',
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  TextFormField(
                    controller: _temperatureController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: false),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]'))],
                    decoration: const InputDecoration(labelText: 'Temperatura en °C (opcional)', hintText: 'Ej. 38.5', border: OutlineInputBorder(), suffixText: '°C'),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return null;
                      final parsed = double.tryParse(value.trim().replaceAll(',', '.'));
                      return parsed == null || parsed < 30 || parsed > 45 ? 'Ingresa una temperatura entre 30 y 45 °C.' : null;
                    },
                  ),
                  const SizedBox(height: 12),
                  const Text('¿Muestra dolor al tocar la zona?'),
                  _yesNo(value: _painOnTouch, onChanged: (value) => setState(() => _painOnTouch = value)),
                ]),
              ),
              _QuestionCard(
                number: '5', title: 'Motivo y observaciones',
                child: TextFormField(
                  controller: _observationsController,
                  maxLines: 4,
                  maxLength: 1000,
                  decoration: const InputDecoration(hintText: 'Describe qué observaste y desde cuándo…', border: OutlineInputBorder(), alignLabelWithHint: true),
                  validator: (value) => value == null || value.trim().length < 5 ? 'Agrega una breve descripción del motivo.' : null,
                ),
              ),
              _QuestionCard(
                number: '+', title: 'Fotografía (opcional)',
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (_photo != null) ...[
                    ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.file(File(_photo!.path), height: 190, width: double.infinity, fit: BoxFit.cover)),
                    Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: () => setState(() => _photo = null), icon: const Icon(Icons.delete_outline), label: const Text('Quitar foto'))),
                  ] else
                    OutlinedButton.icon(onPressed: _choosePhoto, icon: const Icon(Icons.add_a_photo_outlined), label: const Text('Adjuntar fotografía')),
                ]),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('El resultado es una orientación para priorizar la atención. No sustituye una consulta veterinaria.', style: TextStyle(color: Colors.black54, fontSize: 12)),
              ),
              FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_outlined),
                label: Text(_submitting ? 'Enviando reporte…' : 'Enviar al equipo veterinario'),
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
              ),
            ],
          ),
        ),
      );

  Widget _intro(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFEAF2EB), borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          const Icon(Icons.health_and_safety_outlined, color: Color(0xFF32694D), size: 30),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Cuéntanos cómo está ${widget.patient.nombre}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Tus respuestas ayudan a ordenar la atención.', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
          ])),
        ]),
      );

  Widget _yesNo({required bool? value, required ValueChanged<bool> onChanged}) => Row(children: [
        Expanded(child: _selectTile(label: 'Sí', selected: value == true, onTap: () => onChanged(true))),
        const SizedBox(width: 10),
        Expanded(child: _selectTile(label: 'No', selected: value == false, onTap: () => onChanged(false))),
      ]);

  Widget _choiceGroup<T extends Object>({required T? value, required Map<T, String> values, required ValueChanged<T> onChanged}) =>
      Column(children: values.entries.map((entry) => RadioListTile<T>(
        value: entry.key, groupValue: value, onChanged: (selected) { if (selected != null) onChanged(selected); },
        title: Text(entry.value, style: const TextStyle(fontSize: 14)), contentPadding: EdgeInsets.zero, dense: true,
      )).toList());

  Widget _selectTile({required String label, required bool selected, required VoidCallback onTap}) =>
      InkWell(onTap: onTap, borderRadius: BorderRadius.circular(9), child: Container(
        alignment: Alignment.center, padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: selected ? const Color(0xFFEAF2EB) : Colors.white, borderRadius: BorderRadius.circular(9), border: Border.all(color: selected ? const Color(0xFF32694D) : Colors.black12)),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? const Color(0xFF32694D) : null)),
      ));
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.number, required this.title, required this.child});
  final String number;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(radius: 13, backgroundColor: const Color(0xFFEAF2EB), child: Text(number, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF32694D)))),
            const SizedBox(width: 9),
            Expanded(child: Padding(padding: const EdgeInsets.only(top: 3), child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)))),
          ]),
          const SizedBox(height: 12),
          child,
        ])),
      );
}
