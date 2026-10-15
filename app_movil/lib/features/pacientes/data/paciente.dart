class Paciente {
  const Paciente({
    required this.id,
    required this.nombre,
    required this.especie,
    this.raza,
    this.sexo,
  });

  final int id;
  final String nombre;
  final String especie;
  final String? raza;
  final String? sexo;

  factory Paciente.fromJson(Map<String, dynamic> json) => Paciente(
        id: (json['id'] as num).toInt(),
        nombre: json['nombre']?.toString() ?? 'Mascota',
        especie: json['especie']?.toString() ?? 'Animal',
        raza: json['raza']?.toString(),
        sexo: json['sexo']?.toString(),
      );
}
