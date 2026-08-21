# Contrato de producto — Academia Estratégica Cuántica

## Norte

La aplicación es una academia estratégica pública 13+, bilingüe y accesible, con dos rutas completas: ajedrez clásico y ajedrez cuántico. Debe sentirse como un club editorial unido a un instrumento científico: calmado y legible durante el estudio o el juego, con espectáculo controlado únicamente en eventos cuánticos importantes.

## Audiencia y promesa

- Una persona nueva puede iniciar una lección o una partida en un máximo de dos decisiones.
- Un jugador habitual conserva acceso directo al tablero, reglas estándar, guardado y replay.
- El aprendizaje esencial es gratuito, sin anuncios, chat, contenido de usuarios ni ventajas de pago.
- La cuenta es opcional: el invitado conserva progreso local y puede vincularlo posteriormente.
- No se aceptan cuentas de menores de 13 años; se solicita confirmación sin almacenar la fecha de nacimiento.

## Recorridos principales

1. Empezar mediante un diagnóstico opcional o la siguiente actividad recomendada.
2. Recorrer libremente un mapa de ocho módulos clásicos y ocho cuánticos.
3. Practicar con explicación, ejercicio guiado, puzle y examen por módulo.
4. Volver a conceptos mediante repaso espaciado y cuaderno de errores.
5. Jugar `classic`, `quantum-standard` o `quantum-coherence` localmente o contra IA.
6. Comprender antes de confirmar una captura cuántica sus resultados y probabilidades.
7. Revisar una partida terminada, comparar candidatos y ramificar el replay sin alterarlo.
8. Vincular una cuenta, sincronizar eventos y exportar o borrar los datos.

## Contratos que no deben romperse

- Clásico sigue las transiciones de `chess.js`.
- Cuántico estándar conserva exactamente las reglas y la forma de `QState` anteriores.
- Cuántico no usa jaque ni mate: capturar el rey gana y quedarse sin acciones legales empata.
- Las transiciones entran por acciones tipadas y la aleatoriedad es inyectable y reproducible.
- `quantum-coherence` deriva el consumo del tablero y la configuración; no modifica el estado estándar.
- Los replays guardan acciones y resultados neutrales al idioma.
- El cliente de una partida autoritativa envía acciones con versión esperada, nunca snapshots.
- El contenido comenzado queda fijado a su versión hasta terminar el intento.

## Aprendizaje adaptativo

- Intento 0–100 por corrección, pistas y eficiencia.
- Nuevo dominio: `0,7 × anterior + 0,3 × intento`.
- Un módulo posterior requiere dominio 70 y dos resoluciones independientes; lo completado no vuelve a bloquearse.
- Diagnóstico limitado a dominio 60.
- Repasos a 1, 3, 7, 14 y 30 días; un fallo retrocede un intervalo.
- Pistas: pregunta conceptual, foco visual, candidatos reducidos y solución explicada.

## Privacidad y sostenibilidad

- Progreso funcional y telemetría están separados.
- La telemetría es opt-in y solo admite ruta, lección, concepto, duración, puntuación y nivel de pista.
- Nunca recoge estado completo de tablero, texto personal o movimientos.
- La membresía de apoyo solo desbloquea temas, piezas, sonido y distintivo accesibles.
- Ningún cosmético altera contraste, probabilidad o información competitiva.

## Criterios de salida

- Objetivo, estado, ayuda, éxito, error y recuperación en toda actividad.
- Ninguna acción competitiva puede escribirse directamente desde el cliente.
- Una interrupción offline no pierde progreso confirmado.
- Todas las acciones alcanzan 44×44 px y los estados no dependen solo del color.
- Funcionamiento desde 320×568 hasta 1440×900, teclado, lector, zoom 200 %, alto contraste y movimiento reducido.
- LCP < 2,5 s, INP < 200 ms, CLS < 0,1 y entrada inicial comprimida < 150 kB.
- No se publica clasificación hasta superar carga concurrente y beta cerrada sin divergencias críticas.

## Límites de esta entrega

La Academia, los modos locales/IA, PWA, persistencia, replays, análisis y contratos de backend están implementados. El online cuántico autoritativo y competitivo permanecen apagados hasta extraer el núcleo TypeScript compartido al servicio, conectar persistencia Supabase real, validar carga y completar la beta. Las temporadas, chat, UGC, aula, envoltorio nativo y tutor generativo quedan fuera.
