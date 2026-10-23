// Prueba básica de arranque de la app móvil.
// El test anterior referenciaba `MyApp`, una clase que no existe en main.dart,
// por lo que `flutter test` no compilaba.

import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/main.dart';

void main() {
  testWidgets('muestra la pantalla de inicio de sesión', (WidgetTester tester) async {
    await tester.pumpWidget(const VeterinariaApp());

    expect(find.text('Bienvenido'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
    expect(find.text('Correo electrónico'), findsOneWidget);
  });
}
