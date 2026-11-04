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

  bool _hasPendingChanges() {
    return _activeBleeding != null ||
        _appetite != null ||
        _activity != null ||
        _painOnTouch != null ||
        _photo != null ||
        _observationsController.text.trim().isNotEmpty ||
        _temperatureController.text.trim().isNotEmpty;
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
    // La validación ahora evalúa directamente cada pregunta visualmente
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Por favor, completa todas las preguntas obligatorias.'),
          backgroundColor: Colors.red.shade800,
          behavior: SnackBarBehavior.floating,
        ),
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
      
      _showSemanticResultDialog(severity, score);

    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No se pudo enviar el triaje: ${error.toString().replaceAll('Exception:', '').trim()}'),
          backgroundColor: Colors.red.shade800,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSemanticResultDialog(String severity, String? score) {
    Color cardColor;
    IconData icon;
    String label;

    switch (severity.toLowerCase()) {
      case 'critica':
      case 'crítica':
        cardColor = const Color(0xFFCA5C4A);
        icon = Icons.error_outline;
        label = 'Prioridad Crítica';
        break;
      case 'moderada':
        cardColor = const Color(0xFFAD7922);
        icon = Icons.warning_amber_rounded;
        label = 'Prioridad Moderada';
        break;
      case 'leve':
        cardColor = const Color(0xFF4E875F);
        icon = Icons.check_circle_outline;
        label = 'Prioridad Leve';
        break;
      default:
        cardColor = Colors.grey.shade600;
        icon = Icons.info_outline;
        label = 'Pendiente de cálculo';
    }

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 34,
              backgroundColor: cardColor.withOpacity(0.12),
              child: Icon(icon, color: cardColor, size: 38),
            ),
            const SizedBox(height: 20),
            const Text('Reporte enviado', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(
              'El caso de ${widget.patient.nombre} fue recibido exitosamente por el equipo de la clínica.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: cardColor.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardColor.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Text(label, style: TextStyle(color: cardColor, fontWeight: FontWeight.bold, fontSize: 16)),
                  if (score != null) ...[
                    const SizedBox(height: 4),
                    Text('Puntaje: $score', style: TextStyle(color: cardColor, fontSize: 13, fontWeight: FontWeight.w600)),
                  ]
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Esta evaluación es orientativa. El veterinario determinará el diagnóstico y los pasos a seguir.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                Navigator.pop(context); // Cierra el diálogo
                Navigator.pop(context); // Cierra la pantalla de triaje y vuelve a pacientes
              },
              child: const Text('Entendido, volver a inicio'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        
        if (!_hasPendingChanges() || _submitting) {
          Navigator.pop(context);
          return;
        }

        final discard = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('¿Descartar reporte?'),
            content: const Text('Tienes un triaje en progreso. Si sales ahora, los datos y fotografías se perderán.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
                onPressed: () => Navigator.pop(context, true), 
                child: const Text('Descartar')
              ),
            ],
          ),
        );

        if (discard == true && context.mounted) {
          Navigator.pop(context);
        }
      },
      child: Scaffold(
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
                child: _yesNo(
                  value: _activeBleeding, 
                  onChanged: (value) => setState(() => _activeBleeding = value),
                ),
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
                  const SizedBox(height: 16),
                  const Text('¿Muestra dolor al tocar la zona afectada?'),
                  const SizedBox(height: 8),
                  _yesNo(
                    value: _painOnTouch, 
                    onChanged: (value) => setState(() => _painOnTouch = value),
                  ),
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
      ),
    );
  }

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

  Widget _yesNo({required bool? value, required ValueChanged<bool> onChanged}) {
    return FormField<bool>(
      initialValue: value,
      validator: (val) => val == null ? 'Por favor selecciona una opción.' : null,
      builder: (state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: _selectTile(label: 'Sí', selected: state.value == true, onTap: () { state.didChange(true); onChanged(true); })),
              const SizedBox(width: 10),
              Expanded(child: _selectTile(label: 'No', selected: state.value == false, onTap: () { state.didChange(false); onChanged(false); })),
            ]),
            if (state.hasError)
              Padding(
                padding: const EdgeInsets.only(top: 8, left: 4),
                child: Text(state.errorText!, style: TextStyle(color: Colors.red.shade800, fontSize: 12)),
              ),
          ],
        );
      },
    );
  }

  Widget _choiceGroup<T extends Object>({required T? value, required Map<T, String> values, required ValueChanged<T> onChanged}) {
    return FormField<T>(
      initialValue: value,
      validator: (val) => val == null ? 'Por favor selecciona una opción.' : null,
      builder: (state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: values.entries.map((entry) => RadioListTile<T>(
                value: entry.key, 
                groupValue: state.value, 
                onChanged: (selected) { 
                  if (selected != null) {
                    state.didChange(selected);
                    onChanged(selected); 
                  }
                },
                title: Text(entry.value, style: const TextStyle(fontSize: 14)), 
                contentPadding: EdgeInsets.zero, 
                dense: true,
                activeColor: const Color(0xFF32694D),
              )).toList()
            ),
            if (state.hasError)
              Padding(
                padding: const EdgeInsets.only(top: 4, left: 4),
                child: Text(state.errorText!, style: TextStyle(color: Colors.red.shade800, fontSize: 12)),
              ),
          ],
        );
      },
    );
  }

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