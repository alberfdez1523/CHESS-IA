# Academia Estratégica Cuántica

Evolución de **Gambito de Dama Cuántico** hacia una PWA educativa bilingüe y accesible para aprender y jugar ajedrez clásico y cuántico. El reglamento anterior se conserva en `classic` y `quantum-standard`; la nueva mecánica vive de forma aislada en `quantum-coherence`.

## Qué incluye

- Academia local-first con 2 rutas, 16 módulos y 64 actividades validadas con Zod.
- Diagnóstico opcional, recomendación adaptativa, dominio por habilidad, repaso espaciado, cuaderno de errores, reto diario y Puzzle Sprint de 3, 5 o 10 minutos.
- Puntuación 0–100, dominio `0,7 × anterior + 0,3 × intento`, desbloqueo por dominio y resoluciones independientes, y escalera de cuatro pistas.
- Ajedrez clásico, cuántico estándar y variante **Coherencia limitada** con capacidades 2, 4 o 6.
- IA cuántica determinista en Web Worker, cancelable, con semilla y presupuesto por dificultad.
- Vista previa de resultados probabilísticos antes de capturas complejas.
- Replays con acciones neutrales al idioma, análisis posterior y laboratorio ramificable «¿Qué habría pasado si…?».
- Invitado persistente, IndexedDB, sincronización append-only idempotente y vinculación opcional por enlace mágico o Google.
- PWA instalable con shell y contenido educativo offline, actualización diferida durante partidas.
- Temas claro, oscuro y sistema, alto contraste, movimiento reducido explícito, piezas/tableros seleccionables, narración ajustable, sonido y vibración opcional.
- API v1 para progreso, coach, retos, replays, telemetría consentida, perfil y partidas autoritativas.
- Migraciones Supabase versionadas con RLS y escritura de estados de partida reservada al servicio.

El contenido educativo esencial, las reglas, el tutor y los retos no dependen de una membresía. La integración de apoyo solo admite cosméticos accesibles y está apagada por defecto.

## Rutas de la PWA

| Ruta | Uso |
|---|---|
| `/` | Inicio adaptado a usuario nuevo o recurrente |
| `/learn` | Mapa de habilidades, diagnóstico, repaso y reto diario |
| `/learn/:lessonId` | Actividad profunda con versión de contenido fijada |
| `/learn/sprint/:minutes` | Puzzle Sprint de 3, 5 o 10 minutos |
| `/play` | Partida activa local o contra IA |
| `/online` | Lobby online de transición |
| `/join/:code` | Unión mediante código; `?room=` se redirige aquí |
| `/profile` | Cuenta, exportación, borrado y apoyo opcional |
| `/rules` | Referencia de reglas |

## Reglas y motores

### Modos estables

- `classic`: reglas completas mediante `chess.js` y Stockfish para IA/análisis.
- `quantum-standard`: split, fusión, medición, túnel y enroque cuántico sin cambio de contrato.
- En ajedrez cuántico, capturar el rey gana y no disponer de acciones legales produce tablas.

### Coherencia limitada

- Cada jugador parte de una capacidad configurable de 2, 4 o 6; el valor competitivo previsto es 4.
- Cada rama adicional consume una unidad.
- Un entrelazamiento de túnel activo consume una unidad adicional.
- El enroque cuántico requiere dos unidades libres.
- Fusiones y colapsos liberan capacidad; no hay regeneración ni gasto permanente.
- La UI comunica uso y disponibilidad con número, segmentos y etiqueta accesible.

### Tutor y análisis

- Clásico: Stockfish MultiPV, pérdida en centipawns y detectores deterministas de captura, jaque y seguridad del rey.
- Cuántico: enumeración legal y evaluación reproducible de material esperado, seguridad, ramas y coherencia.
- Las explicaciones se resuelven mediante claves localizadas; las posiciones no se envían a modelos generativos.

## Arquitectura

```mermaid
flowchart LR
    UI["React PWA"] <--> IDB["IndexedDB"]
    UI --> API["FastAPI + API v1"]
    API --> MATCH["Servicio autoritativo"]
    API --> DB["Supabase Postgres"]
    DB -. "Realtime de lectura" .-> UI
    API --> POOL["Pool Stockfish"]
```

- Frontend: React 18, TypeScript, Vite, Tailwind, React Router, Zod e IndexedDB.
- Backend: FastAPI, contratos Pydantic estrictos, repositorios de progreso/partidas y pool acotado de Stockfish.
- Datos: migraciones SQL versionadas bajo `supabase/migrations`.
- Entrega: cada bloque de riesgo se controla mediante feature flags.

El adaptador API incluido conserva datos en memoria para desarrollo y pruebas. Las migraciones definen el esquema de producción; conectar el repositorio del servicio a un proyecto Supabase real es una tarea de despliegue, no una precondición para el modo local-first.

## Instalación local

Requisitos: Node.js 20+, Python 3.12+ y Stockfish en `PATH` o dentro de `engine/`. Para trabajar sin Stockfish se puede usar `SKIP_STOCKFISH=1`.

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

Set-Location frontend
npm ci
npm run build
Set-Location ..

python server.py
```

La aplicación compilada queda servida en `http://localhost:8000`. Para hot reload:

```powershell
Set-Location frontend
npm run dev
```

Vite abre `http://localhost:5173` y proxifica `/api` al backend configurado.

## Configuración

Copiar `.env.example` para el backend/despliegue y `frontend/.env.example` para las variables de compilación. No se versionan secretos.

Variables principales:

- `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: verificación de JWT en la API.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: Auth/Realtime desde el navegador.
- `STOCKFISH_POOL_SIZE` y `STOCKFISH_QUEUE_TIMEOUT`: capacidad y espera del pool.
- `VITE_SUPPORTER_CHECKOUT_URL`: URL HTTPS de Stripe Checkout; solo se usa con su flag activo.
- `FEATURE_AUTHORITATIVE_QUANTUM`: mantiene apagadas las acciones cuánticas online hasta completar el núcleo compartido y la prueba de carga.

Los valores y defaults completos están en los dos archivos de ejemplo.

## Migraciones Supabase

Las migraciones crean perfiles, eventos de progreso, dominio, logros, retos, partidas, eventos de partida, ratings, entitlements, analítica consentida y replays terminados. La escritura de progreso y partidas se reserva al rol de servicio; el cliente autenticado recibe políticas de lectura sobre sus propios datos.

```powershell
npx supabase@2.113.0 db reset
```

El comando requiere Docker para la base local. En este entorno se validó la CLI y el SQL se revisó, pero no se ejecutó `db reset` porque Docker no está instalado.

## Verificación

```powershell
# Backend
python -m pytest -q

# Frontend unitario y build
Set-Location frontend
npm test
npm run build

# Matriz E2E: Chromium, Firefox y WebKit
npm run e2e

# Build PWA real y recarga offline
npm run e2e:pwa

# Gates de entrega apagados
npm run e2e:flags
```

Playwright usa un worker para que la matriz con Web Workers y múltiples viewports sea determinista en CI de pocos recursos. Los E2E cubren 320×568, 390×844, 768×1024, 1280×720 y 1440×900, teclado, movimiento reducido, persistencia, modos avanzados y Academia.

Baseline verificada de esta entrega:

- 71 pruebas unitarias frontend.
- 18 pruebas backend.
- 60 recorridos E2E: 20 en cada motor de navegador, más dos pruebas PWA de producción y una de gates apagados.
- Build de producción correcto y entrada crítica de ~133,9 kB gzip (JS + CSS), por debajo de 150 kB.

## Estado de lanzamiento

La experiencia local, Academia, PWA, Coherencia limitada local/IA, replays y análisis están implementados. El online cuántico autoritativo y el competitivo aún no se exponen; el servidor mantiene su gate cuántico cerrado hasta completar núcleo compartido, carga y beta. La membresía sí está preparada tras un flag y una URL válida de Checkout. Véase [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Licencia

MIT
