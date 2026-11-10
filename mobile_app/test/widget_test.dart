import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streamx/app.dart';

void main() {
  testWidgets('home feed and primary navigation render', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const StreamXApp());
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Picked for you'), findsOneWidget);
    expect(find.text('The quiet coast of Lofoten'), findsWidgets);
    expect(find.byType(NavigationBar), findsOneWidget);

    await tester.tap(find.byIcon(Icons.explore_outlined));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Explore videos'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });
}
