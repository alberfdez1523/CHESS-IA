# Sistema visual — Instrumento editorial de ajedrez

Referencia de diseño: [contrato desktop, móvil, Academia, lobby y tokens](https://www.figma.com/design/R6UrlElyPpXxYlcx18Kwte).

## Dirección

El tablero sigue siendo el ancla. La interfaz debe retirarse durante el cálculo y recuperar presencia cuando explica, recomienda o confirma una decisión. Se usa `DESIGN_VARIANCE 5`, `VISUAL_DENSITY 5` y `MOTION_INTENSITY 4`; una medición puede llegar a 7 durante un máximo de 1,2 segundos.

## Lenguaje visual

- Grafito: shell y superficies de inspector.
- Marfil: texto principal y material claro del tablero.
- Latón: ajedrez clásico y acciones clásicas.
- Violeta eléctrico: selección, ramas y medición cuánticas.
- Cian: fusión y entrelazamiento.
- Rojo: peligro o acción destructiva.

El color siempre se acompaña de texto, contorno, icono, porcentaje o patrón. Los tokens semánticos de superficie, texto, acción clásica, acción cuántica, fusión, éxito, aviso y peligro sustituyen excepciones locales.

## Tipografía y forma

- Geist Sans para marca, títulos, controles y cuerpo.
- Geist Mono para relojes, códigos, probabilidades y notación.
- Fuentes y glifos de piezas autoalojados para uso offline.
- Escala: 13, 15, 17, 20, 24, 32 y 44 px.
- Controles con radio 8 px; paneles con 12 px; píldoras solo para estados compactos.
- Escala de espacio: 4, 8, 12, 16, 24, 32 y 48 px.

## Anatomía

### Inicio

- Usuario nuevo: «Empezar a aprender» domina y «Jugar» es secundaria.
- Usuario recurrente: próxima lección, repasos, reto diario y partida guardada.
- Navegación estable: Inicio, Aprender, Jugar y Perfil; barra inferior móvil fuera de la partida.

### Academia

- El mapa expresa curso, módulos, progreso, bloqueos y próximo paso.
- Cada actividad mantiene objetivo, concepto, ejercicio, escalera de pistas y cierre recuperable.
- Diagnóstico, repaso, error, reto diario y sprint se distinguen por texto y estructura, no solo por acento.

### Partida

- Desktop: rail contextual, tablero y panel de estado/análisis.
- Móvil: cabecera compacta, jugadores, tablero, controles y bottom sheets para instrucciones o inspector.
- Ramas con porcentaje visible, contorno compartido y patrón; split numerado, fusión en cian y entrelazamiento conectado.
- Las capturas complejas abren un árbol de resultados antes de confirmar.
- La coherencia aparece junto a cada jugador con número, segmentos y `aria-label` actualizado.

### Medición

El tablero permanece visible detrás de una superficie enfocada. Se explica qué se mide, con qué probabilidad y qué consecuencia tiene. Con movimiento reducido el resultado se presenta sin animación; en online el diseño contempla un máximo de 15 segundos.

## Accesibilidad

- Contraste AA como mínimo y modo de alto contraste independiente.
- Objetivos interactivos de al menos 44×44 CSS px.
- Foco visible, tablero con tabindex móvil, flechas, Enter/Espacio y región viva.
- `document.lang`, `theme-color`, narración y etiquetas responden a ajustes.
- Temas claro, oscuro y sistema; movimiento sistema, completo o reducido.
- `overscroll-behavior` se limita a la partida y no hay scroll suave con movimiento reducido.
- Sonidos distintos para movimiento, split, fusión, captura y medición; vibración siempre opcional.

## Contrato responsive

El shell usa grid y el escenario calcula el tablero con el mínimo entre ancho disponible, alto restante y 720 px. Ninguna altura fija depende de que una traducción ocupe una sola línea.

Baselines verificadas: 320×568, 390×844, 768×1024, 1280×720 y 1440×900 en los tres motores de navegador. La pantalla de partida no muestra la barra inferior global para no competir con el tablero.
