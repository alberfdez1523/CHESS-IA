# Gambito de Dama Cuántico

https://gambito-dama-cuantico.onrender.com/

Aplicación web de ajedrez con dos modos de juego:

| Modo | Opciones |
|------|----------|
| **Clásico** | Vs IA (Stockfish), 2 jugadores local, online |
| **Cuántico** | Vs IA cuántica, 2 jugadores local, online |

El modo cuántico añade superposición, fusión, enroque cuántico, medición probabilística y efecto túnel.

Desde el inicio hay un **Tutorial cuántico** opcional con ejemplos paso a paso de movimientos especiales, capturas con medición y normas propias del modo cuántico.

---

## Modo clásico

- Reglas completas vía `chess.js`
- 5 niveles de dificultad contra Stockfish (`beginner` → `master`)
- Partida local a 2 jugadores, multijugador online (Supabase)
- Historial descriptivo, barra de evaluación (vs IA), reloj opcional
- Promoción, enroque, jaque, mate y tablas

---

## Modo cuántico

### Reglas principales

- **Movimiento cuántico (split):** piezas no peón en dos casillas (probabilidades repartidas).
- **Fusión:** reunir fragmentos de la misma pieza en una casilla al 100 %.
- **Enroque cuántico:** con entrelazamiento rey/torre.
- **Efecto túnel:** atravesar piezas cuánticas en línea.
- **Medición:** al capturar entre estados clásico/cuántico, una ruleta decide el colapso.

### Capturas y medición

| Atacante | Defensor | Comportamiento |
|----------|----------|----------------|
| Clásica | Clásica | Captura normal |
| Clásica | Cuántica | Se mide la defensora |
| Cuántica | Clásica | Se mide la atacante |
| Cuántica | Cuántica | Primero atacante, luego defensora |

**Experiencia de medición (local y online):**

1. El tablero **no muestra el resultado** del movimiento hasta cerrar la ruleta.
2. **Ambos jugadores** ven la ruleta y pueden girarla (suspense compartido).
3. En online, quien hizo el movimiento cierra la ruleta y libera el turno; el rival puede girar antes pero espera el cierre del iniciador.

### Modo Cuántico vs IA

La IA **no** usa `bestmove` clásico de Stockfish como jugada cuántica. Flujo:

```
QuantumChessEngine → acciones legales → simular → heurística + eval Stockfish opcional → elegir → ejecutar
```

- **5 niveles de dificultad** (`beginner` … `master`): más aleatoriedad en niveles bajos, más precisión en `hard`/`master`.
- **Heurística local** siempre activa; **Stockfish** solo evalúa posiciones simuladas (`/api/quantum/eval` o batch) si el servidor está disponible.
- Movimientos legales: clásicos, splits, fusiones, enroque cuántico, capturas con medición.

Archivos clave:

```txt
frontend/src/lib/quantumEngine.ts   # Motor de reglas
frontend/src/lib/quantumAi.ts       # IA cuántica
frontend/src/hooks/useQuantumChess.ts
```

---

## API backend

| Endpoint | Uso |
|----------|-----|
| `POST /api/move` | Mejor jugada clásica (FEN) |
| `POST /api/eval` | Evaluación clásica |
| `POST /api/quantum/eval` | Evaluación ponderada de estado cuántico |
| `POST /api/quantum/eval-batch` | Varias evaluaciones en una petición (IA) |
| `POST /api/quantum/move` | Experimental (no usado por la UI) |
| `GET /api/health` | Estado del motor |

---

## Stack técnico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Clásico:** `chess.js`
- **Cuántico:** motor propio `QuantumChessEngine`
- **Backend:** FastAPI (`server.py`)
- **IA clásica:** Stockfish vía `python-chess`
- **Online:** Supabase (Auth anónimo, Postgres, Realtime, Presence)

## Estructura del proyecto

```txt
frontend/
  src/
    components/
      StartMenu.tsx
      GameScreen.tsx
      QuantumGameScreen.tsx
      QuantumMeasurementRoulette.tsx
    hooks/
      useChessGame.ts
      useQuantumChess.ts
      useOnlineGameSync.ts
    lib/
      quantumEngine.ts
      quantumAi.ts
      api.ts
  e2e/
    game.spec.ts
    quantum-ai.spec.ts
server.py
tests/
```

---

## Instalación

### Requisitos

- Python 3.10+
- Node.js 18+
- Stockfish (en `PATH` o en `engine/`)

### Backend

```bash
py -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
py server.py
```

### Frontend

```bash
cd frontend
npm ci
npm run build   # genera frontend/dist
```

La app se sirve en `http://localhost:8000` desde FastAPI con `frontend/dist`.

Desarrollo con hot reload:

```bash
cd frontend
npm run dev     # http://localhost:5173
```

### Variables de entorno (online)

En `frontend/.env` o build:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE=          # opcional; por defecto /api o localhost:8000 en dev
```

La configuración de Supabase (variables reales, esquema, políticas y funciones privadas) no se versiona en este repositorio. Debe mantenerse en el entorno privado de despliegue/desarrollo.

---

## Pruebas

```bash
# Backend
pytest -q

# Frontend unitario
cd frontend
npm test

# Build
npm run build

# E2E (Playwright)
npm run e2e
```

Prueba de humo multijugador (dos navegadores):

```bash
cd frontend
npm run smoke:multiplayer
```

Requisitos smoke: backend en `http://localhost:8000`, build con Supabase configurado, Chrome/Edge.

La suite E2E valida flujos clásico/cuántico, IA cuántica y viewports `390×844`, `768×1024`, `1280×720`, `1440×900`.

En CI, `SKIP_STOCKFISH=1` desactiva el motor; los tests de eval devuelven `503` controlado.

---

## Notas de uso

- **Clásico vs IA** y **cuántico vs IA** mejoran con Stockfish en marcha; sin motor, la IA cuántica sigue con heurística local.
- **Cuántico 2 jugadores** y **online** no requieren Stockfish.

## Licencia

MIT
