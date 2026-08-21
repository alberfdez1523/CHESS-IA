import {
  ACADEMY_CONTENT_VERSION,
  academyContentSchema,
  type AcademyContent,
  type AcademyModule,
  type ActivityKind,
  type LessonDefinition,
  type LocalizedText,
} from './academyTypes'

const t = (es: string, en: string): LocalizedText => ({ es, en })

interface FactSeed {
  title: LocalizedText
  summary: LocalizedText
  correct: LocalizedText
  explanation: LocalizedText
}

interface ModuleSeed extends Omit<AcademyModule, 'order'> {
  misconceptions: [LocalizedText, LocalizedText]
  facts: [FactSeed, FactSeed, FactSeed, FactSeed]
}

const classicSeeds: ModuleSeed[] = [
  {
    id: 'classic-board', course: 'classic', skillId: 'classic.board', accent: 'classic',
    title: t('Tablero y notación', 'Board and notation'),
    summary: t('Lee una posición y registra jugadas sin ambigüedad.', 'Read a position and record moves without ambiguity.'),
    misconceptions: [
      t('Las coordenadas cambian según el color del jugador.', 'Coordinates change with the player colour.'),
      t('Solo las capturas necesitan una notación precisa.', 'Only captures need precise notation.'),
    ],
    facts: [
      { title: t('Coordenadas', 'Coordinates'), summary: t('Cada casilla combina una letra y un número.', 'Every square combines a letter and a number.'), correct: t('Las columnas van de a a h y las filas de 1 a 8.', 'Files run from a to h and ranks from 1 to 8.'), explanation: t('La coordenada no cambia al girar el tablero: e4 siempre es e4.', 'A coordinate does not change when the board flips: e4 is always e4.') },
      { title: t('Turno', 'Turn'), summary: t('Una posición siempre indica quién mueve.', 'A position always identifies who moves.'), correct: t('Las blancas realizan la primera jugada y después se alternan turnos.', 'White makes the first move and turns then alternate.'), explanation: t('Conocer el turno es imprescindible para evaluar amenazas y legalidad.', 'Knowing the turn is essential for evaluating threats and legality.') },
      { title: t('Símbolos de pieza', 'Piece symbols'), summary: t('La notación abrevia las piezas mayores.', 'Notation abbreviates the major pieces.'), correct: t('El peón no usa letra; caballo, alfil, torre, dama y rey sí.', 'A pawn has no letter; knight, bishop, rook, queen and king do.'), explanation: t('La casilla de destino completa la identificación de una jugada normal.', 'The target square completes the identity of a normal move.') },
      { title: t('Notación algebraica', 'Algebraic notation'), summary: t('Una jugada debe distinguir pieza, destino y eventos especiales.', 'A move must identify piece, target and special events.'), correct: t('La notación añade x en capturas, + en jaques y # en mates.', 'Notation adds x for captures, + for check and # for mate.'), explanation: t('Estos marcadores permiten reconstruir y estudiar una partida.', 'These markers make a game possible to reconstruct and study.') },
    ],
  },
  {
    id: 'classic-rules', course: 'classic', skillId: 'classic.rules', accent: 'classic',
    title: t('Reglas y finales de partida', 'Rules and game endings'),
    summary: t('Distingue jugadas legales, jaque, mate y tablas.', 'Distinguish legal moves, check, mate and draws.'),
    misconceptions: [
      t('El rey puede permanecer en jaque si captura después.', 'The king may remain in check if it captures later.'),
      t('Toda posición sin jaque es automáticamente legal.', 'Every position without check is automatically legal.'),
    ],
    facts: [
      { title: t('Jugada legal', 'Legal move'), summary: t('Tu rey no puede quedar atacado.', 'Your king may not remain attacked.'), correct: t('Una jugada es ilegal si deja al propio rey en jaque.', 'A move is illegal if it leaves your own king in check.'), explanation: t('La seguridad del rey se comprueba después de aplicar la jugada.', 'King safety is checked after applying the move.') },
      { title: t('Jaque', 'Check'), summary: t('El rey está bajo ataque inmediato.', 'The king is under immediate attack.'), correct: t('Debes mover el rey, bloquear el ataque o capturar la pieza atacante.', 'You must move the king, block the attack or capture the attacker.'), explanation: t('Cualquier respuesta debe eliminar por completo el jaque.', 'Every response must remove the check completely.') },
      { title: t('Jaque mate', 'Checkmate'), summary: t('No existe ninguna defensa legal.', 'No legal defence exists.'), correct: t('El mate termina la partida y gana quien realizó el ataque.', 'Checkmate ends the game and the attacker wins.'), explanation: t('No es necesario capturar físicamente el rey en ajedrez clásico.', 'The king is not physically captured in classic chess.') },
      { title: t('Tablas', 'Draws'), summary: t('Una partida puede terminar sin ganador.', 'A game may end without a winner.'), correct: t('Ahogado, repetición y material insuficiente pueden producir tablas.', 'Stalemate, repetition and insufficient material can produce a draw.'), explanation: t('El ahogado ocurre cuando quien mueve no está en jaque pero no tiene jugadas legales.', 'Stalemate occurs when the player to move is not in check but has no legal moves.') },
    ],
  },
  {
    id: 'classic-opening', course: 'classic', skillId: 'classic.opening', accent: 'classic',
    title: t('Principios de apertura', 'Opening principles'),
    summary: t('Construye una posición sana antes de buscar táctica.', 'Build a sound position before looking for tactics.'),
    misconceptions: [
      t('La dama debe salir cuanto antes para crear amenazas.', 'The queen should move out immediately to create threats.'),
      t('Memorizar jugadas importa más que entender la posición.', 'Memorising moves matters more than understanding the position.'),
    ],
    facts: [
      { title: t('Control del centro', 'Central control'), summary: t('El centro amplía el alcance de tus piezas.', 'The centre expands the reach of your pieces.'), correct: t('Peones y piezas deben disputar e4, d4, e5 y d5.', 'Pawns and pieces should contest e4, d4, e5 and d5.'), explanation: t('Controlar no siempre significa ocupar; también sirve atacar esas casillas.', 'Control does not always mean occupation; attacking those squares also counts.') },
      { title: t('Desarrollo', 'Development'), summary: t('Activa las piezas menores con tiempo.', 'Activate minor pieces efficiently.'), correct: t('Caballos y alfiles suelen desarrollarse antes que la dama.', 'Knights and bishops are usually developed before the queen.'), explanation: t('Cada jugada de desarrollo mejora coordinación y prepara el enroque.', 'Each developing move improves coordination and prepares castling.') },
      { title: t('Seguridad del rey', 'King safety'), summary: t('Un rey central limita tu libertad.', 'A central king limits your freedom.'), correct: t('Enrocar pronto suele conectar las torres y reducir amenazas.', 'Castling early often connects the rooks and reduces threats.'), explanation: t('La seguridad concreta de la posición manda sobre una regla automática.', 'The concrete position matters more than any automatic rule.') },
      { title: t('Economía de tiempos', 'Tempo economy'), summary: t('Evita mover la misma pieza sin necesidad.', 'Avoid moving the same piece without need.'), correct: t('Cada tiempo debe desarrollar, disputar el centro o resolver una amenaza.', 'Each tempo should develop, contest the centre or address a threat.'), explanation: t('Perder tiempos permite al rival completar su plan con iniciativa.', 'Wasting tempi lets the opponent complete a plan with initiative.') },
    ],
  },
  {
    id: 'classic-tactics', course: 'classic', skillId: 'classic.tactics', accent: 'classic',
    title: t('Táctica', 'Tactics'),
    summary: t('Reconoce patrones forzados antes de calcular variantes largas.', 'Recognise forcing patterns before calculating long lines.'),
    misconceptions: [
      t('Una táctica solo existe cuando termina en mate.', 'A tactic only exists when it ends in mate.'),
      t('La pieza de mayor valor siempre debe capturar primero.', 'The most valuable piece should always capture first.'),
    ],
    facts: [
      { title: t('Doble ataque', 'Fork'), summary: t('Una pieza amenaza dos objetivos a la vez.', 'One piece attacks two targets at once.'), correct: t('Los caballos crean dobles ataques difíciles de bloquear.', 'Knights create forks that are difficult to block.'), explanation: t('La fuerza está en que el rival normalmente solo puede salvar un objetivo.', 'Its strength comes from the opponent usually being able to save only one target.') },
      { title: t('Clavada', 'Pin'), summary: t('Mover una pieza expondría algo más valioso.', 'Moving a piece would expose something more valuable.'), correct: t('Una clavada absoluta impide mover porque expondría al rey.', 'An absolute pin prevents movement because it would expose the king.'), explanation: t('Una clavada relativa permite mover, aunque suele perder material.', 'A relative pin allows movement but often loses material.') },
      { title: t('Enfilada', 'Skewer'), summary: t('La pieza valiosa se aparta y descubre otra.', 'A valuable piece moves and exposes another one.'), correct: t('La enfilada ataca primero el objetivo de mayor valor.', 'A skewer attacks the more valuable target first.'), explanation: t('Al retirarse el primer objetivo, el segundo queda disponible.', 'When the first target retreats, the second becomes available.') },
      { title: t('Ataque descubierto', 'Discovered attack'), summary: t('Mover una pieza abre la línea de otra.', 'Moving one piece opens another piece line.'), correct: t('La pieza que se aparta puede crear una segunda amenaza simultánea.', 'The moving piece can create a second threat at the same time.'), explanation: t('Los jaques descubiertos son especialmente forzantes porque obligan a responder.', 'Discovered checks are especially forcing because they demand a response.') },
    ],
  },
  {
    id: 'classic-defense', course: 'classic', skillId: 'classic.defense', accent: 'classic',
    title: t('Ataque y defensa', 'Attack and defence'),
    summary: t('Compara amenazas, defensores e intercambios.', 'Compare threats, defenders and exchanges.'),
    misconceptions: [
      t('Atacar siempre es mejor que defender.', 'Attacking is always better than defending.'),
      t('Una pieza defendida no puede perderse.', 'A defended piece cannot be lost.'),
    ],
    facts: [
      { title: t('Amenazas', 'Threats'), summary: t('Pregunta qué quiere hacer el rival.', 'Ask what the opponent wants to do.'), correct: t('Antes de mover, revisa jaques, capturas y ataques directos rivales.', 'Before moving, inspect the opponent checks, captures and direct threats.'), explanation: t('Detectar la amenaza evita calcular planes que ya no son posibles.', 'Detecting the threat avoids calculating plans that are no longer possible.') },
      { title: t('Contar atacantes', 'Count attackers'), summary: t('La seguridad depende de cuántas piezas participan.', 'Safety depends on how many pieces participate.'), correct: t('Compara atacantes y defensores, pero también el valor y el orden de capturas.', 'Compare attackers and defenders, plus value and capture order.'), explanation: t('Contar piezas sin analizar la secuencia puede dar una conclusión falsa.', 'Counting pieces without analysing the sequence can give a false conclusion.') },
      { title: t('Intercambios', 'Exchanges'), summary: t('Cambiar piezas transforma la posición.', 'Trading pieces changes the position.'), correct: t('Con ventaja material suelen favorecerte los cambios de piezas, no siempre los de peones.', 'With a material lead, piece trades often help, but pawn trades may not.'), explanation: t('La decisión depende de actividad, estructura y final resultante.', 'The decision depends on activity, structure and the resulting ending.') },
      { title: t('Profilaxis', 'Prophylaxis'), summary: t('Mejora tu posición mientras frenas el plan rival.', 'Improve your position while limiting the opponent plan.'), correct: t('Una jugada profiláctica elimina una idea rival antes de que sea peligrosa.', 'A prophylactic move removes an opponent idea before it becomes dangerous.'), explanation: t('La mejor defensa suele cumplir además una función activa.', 'The best defence often serves an active purpose too.') },
    ],
  },
  {
    id: 'classic-pawns', course: 'classic', skillId: 'classic.pawns', accent: 'classic',
    title: t('Estructuras de peones', 'Pawn structures'),
    summary: t('Usa la estructura para elegir planes a largo plazo.', 'Use structure to choose long-term plans.'),
    misconceptions: [
      t('Todos los peones débiles se pierden de inmediato.', 'Every weak pawn is lost immediately.'),
      t('Avanzar peones siempre gana espacio sin coste.', 'Advancing pawns always gains space without cost.'),
    ],
    facts: [
      { title: t('Cadenas', 'Pawn chains'), summary: t('Los peones se sostienen en diagonal.', 'Pawns support one another diagonally.'), correct: t('La base de una cadena suele ser el objetivo más estable.', 'The base of a pawn chain is often the most stable target.'), explanation: t('Atacar la cabeza puede ser difícil porque recibe apoyo directo.', 'Attacking the head can be difficult because it receives direct support.') },
      { title: t('Peón aislado', 'Isolated pawn'), summary: t('No tiene peones aliados en columnas vecinas.', 'It has no friendly pawns on adjacent files.'), correct: t('Puede ofrecer actividad y espacio, pero necesita defensa de piezas.', 'It may offer activity and space but needs piece defence.'), explanation: t('Su valor depende de si la actividad compensa la debilidad del final.', 'Its value depends on whether activity compensates for endgame weakness.') },
      { title: t('Peón pasado', 'Passed pawn'), summary: t('Ningún peón rival puede bloquearlo en su columna o adyacentes.', 'No enemy pawn can block it on its file or adjacent files.'), correct: t('Un peón pasado se vuelve más fuerte cuanto más se acerca a promocionar.', 'A passed pawn grows stronger as it approaches promotion.'), explanation: t('Obliga al rival a dedicar piezas a detenerlo.', 'It forces the opponent to dedicate pieces to stopping it.') },
      { title: t('Ruptura', 'Pawn break'), summary: t('Un avance abre líneas o cambia la estructura.', 'A pawn advance opens lines or changes the structure.'), correct: t('Prepara la ruptura asegurando que las líneas abiertas favorezcan a tus piezas.', 'Prepare a pawn break so the opened lines favour your pieces.'), explanation: t('Los avances son irreversibles y también crean nuevas casillas débiles.', 'Pawn moves are irreversible and also create new weak squares.') },
    ],
  },
  {
    id: 'classic-endgames', course: 'classic', skillId: 'classic.endgames', accent: 'classic',
    title: t('Finales', 'Endgames'),
    summary: t('Convierte pequeñas ventajas con técnica.', 'Convert small advantages with technique.'),
    misconceptions: [
      t('El rey debe permanecer protegido detrás de sus peones.', 'The king should remain sheltered behind its pawns.'),
      t('Todos los finales con un peón de más están ganados.', 'Every ending with an extra pawn is won.'),
    ],
    facts: [
      { title: t('Rey activo', 'Active king'), summary: t('El rey se convierte en una pieza de ataque.', 'The king becomes an attacking piece.'), correct: t('Centraliza el rey cuando ya no exista peligro de mate inmediato.', 'Centralise the king when immediate mating danger is gone.'), explanation: t('En finales, una casilla de actividad puede decidir la partida.', 'In endings, one active square can decide the game.') },
      { title: t('Oposición', 'Opposition'), summary: t('Los reyes se enfrentan con una casilla entre ellos.', 'The kings face each other with one square between them.'), correct: t('Tener la oposición puede obligar al rey rival a ceder terreno.', 'Having the opposition can force the enemy king to yield ground.'), explanation: t('Es un recurso esencial en finales de rey y peón.', 'It is an essential resource in king and pawn endings.') },
      { title: t('Torre y peón pasado', 'Rook and passed pawn'), summary: t('La colocación de la torre importa más que una regla mecánica.', 'Rook placement matters more than a mechanical rule.'), correct: t('La torre suele ser más activa detrás del peón pasado, propio o rival.', 'A rook is often most active behind a passed pawn, friendly or enemy.'), explanation: t('Desde detrás conserva líneas de ataque a medida que el peón avanza.', 'From behind it keeps attacking lines as the pawn advances.') },
      { title: t('Conversión', 'Conversion'), summary: t('Reduce el contrajuego antes de correr riesgos.', 'Reduce counterplay before taking risks.'), correct: t('Crea un peón pasado, activa el rey y calcula la carrera final.', 'Create a passed pawn, activate the king and calculate the final race.'), explanation: t('Una ventaja solo cuenta si existe un plan concreto para aumentarla.', 'An advantage matters only when there is a concrete plan to increase it.') },
    ],
  },
  {
    id: 'classic-calculation', course: 'classic', skillId: 'classic.calculation', accent: 'classic',
    title: t('Cálculo práctico', 'Practical calculation'),
    summary: t('Ordena candidatos y decide con una comprobación final.', 'Order candidates and decide with a final check.'),
    misconceptions: [
      t('La primera jugada atractiva suele ser la mejor.', 'The first attractive move is usually best.'),
      t('Calcular más variantes siempre produce una mejor decisión.', 'Calculating more lines always produces a better decision.'),
    ],
    facts: [
      { title: t('Jugadas candidatas', 'Candidate moves'), summary: t('Compara pocas opciones relevantes.', 'Compare a few relevant options.'), correct: t('Incluye jugadas forzantes y al menos una mejora tranquila.', 'Include forcing moves and at least one quiet improvement.'), explanation: t('Una lista breve evita comprometerse demasiado pronto con una idea.', 'A short list prevents committing too early to one idea.') },
      { title: t('Orden forzante', 'Forcing order'), summary: t('Jaque, captura y amenaza reducen respuestas.', 'Checks, captures and threats reduce replies.'), correct: t('Analiza primero las opciones que más limitan al rival.', 'Analyse first the options that constrain the opponent most.'), explanation: t('Ser forzante no garantiza ser bueno; solo facilita comprobarlo.', 'Being forcing does not guarantee quality; it only makes checking easier.') },
      { title: t('Posición final', 'Final position'), summary: t('Evalúa dónde termina la variante.', 'Evaluate where the line ends.'), correct: t('Compara material, rey, actividad, estructura y amenazas restantes.', 'Compare material, king safety, activity, structure and remaining threats.'), explanation: t('No detengas el cálculo justo después de ganar material aparente.', 'Do not stop calculating immediately after an apparent material gain.') },
      { title: t('Comprobación de error', 'Blunder check'), summary: t('Revisa la jugada desde el punto de vista rival.', 'Review the move from the opponent perspective.'), correct: t('Antes de confirmar, busca jaques, capturas y amenazas contra tu posición.', 'Before confirming, look for checks, captures and threats against your position.'), explanation: t('Esta pausa breve elimina muchos errores de una jugada.', 'This short pause removes many one-move errors.') },
    ],
  },
]

const quantumSeeds: ModuleSeed[] = [
  {
    id: 'quantum-model', course: 'quantum', skillId: 'quantum.model', accent: 'quantum',
    title: t('Modelo probabilístico', 'Probability model'),
    summary: t('Interpreta ramas como estados posibles de una sola pieza.', 'Interpret branches as possible states of one piece.'),
    misconceptions: [
      t('Cada rama es una copia independiente que puede moverse por separado.', 'Each branch is an independent copy that can move separately.'),
      t('La rama más visible siempre será el resultado de la medición.', 'The most visible branch is always the measurement result.'),
    ],
    facts: [
      { title: t('Una pieza, varias ramas', 'One piece, many branches'), summary: t('Las ramas comparten identidad.', 'Branches share one identity.'), correct: t('Todas las ramas representan ubicaciones posibles de la misma pieza.', 'All branches represent possible locations of the same piece.'), explanation: t('Capturar o fusionar una rama puede afectar a toda la pieza.', 'Capturing or merging one branch can affect the entire piece.') },
      { title: t('Conservación', 'Conservation'), summary: t('La probabilidad total permanece completa.', 'Total probability remains complete.'), correct: t('Las probabilidades de una pieza viva deben sumar 100%.', 'The probabilities of a living piece must add up to 100%.'), explanation: t('Un split reparte probabilidad; no crea probabilidad nueva.', 'A split distributes probability; it does not create new probability.') },
      { title: t('Lectura visual', 'Visual reading'), summary: t('Porcentaje y contorno identifican cada estado.', 'Percentage and outline identify each state.'), correct: t('Dos ramas con el mismo identificador pertenecen a la misma pieza.', 'Two branches with the same identifier belong to the same piece.'), explanation: t('El color nunca es la única señal: porcentaje y selección confirman la relación.', 'Colour is never the only signal: percentage and selection confirm the relation.') },
      { title: t('Medición', 'Measurement'), summary: t('Una interacción obliga a resolver presencia.', 'An interaction forces presence to resolve.'), correct: t('La medición colapsa la pieza según probabilidades ya establecidas.', 'Measurement collapses the piece according to already established probabilities.'), explanation: t('La animación revela el resultado; no modifica las probabilidades.', 'The animation reveals the result; it does not change probabilities.') },
    ],
  },
  {
    id: 'quantum-classical', course: 'quantum', skillId: 'quantum.classical', accent: 'classic',
    title: t('Movimiento clásico cuántico', 'Classical quantum move'),
    summary: t('Usa acciones seguras dentro del reglamento cuántico.', 'Use deterministic actions inside the quantum ruleset.'),
    misconceptions: [
      t('Toda jugada del modo cuántico debe crear superposición.', 'Every move in quantum mode must create superposition.'),
      t('El jaque mate termina el modo cuántico.', 'Checkmate ends quantum mode.'),
    ],
    facts: [
      { title: t('Destino al 100%', 'A 100% target'), summary: t('La acción clásica no crea ramas.', 'A classical action creates no branches.'), correct: t('La pieza termina con toda su probabilidad en el destino.', 'The piece ends with all its probability on the target.'), explanation: t('Es la herramienta más fiable para desarrollar y capturar.', 'It is the most reliable tool for development and captures.') },
      { title: t('Capturas', 'Captures'), summary: t('Una captura puede activar medición.', 'A capture may trigger measurement.'), correct: t('Clásica contra clásica captura directamente; otras combinaciones miden.', 'Classical against classical captures directly; other combinations measure.'), explanation: t('La interfaz muestra qué pieza se medirá antes de confirmar.', 'The interface shows which piece will be measured before confirmation.') },
      { title: t('Peones', 'Pawns'), summary: t('Los peones conservan movimiento clásico.', 'Pawns retain classical movement.'), correct: t('Los peones no pueden hacer split, pero sí capturar y promocionar.', 'Pawns cannot split, but they can capture and promote.'), explanation: t('Esta restricción mantiene legible la estructura de peones.', 'This restriction keeps pawn structure readable.') },
      { title: t('Condición de victoria', 'Win condition'), summary: t('No se aplica jaque ni mate.', 'Check and mate do not apply.'), correct: t('La partida cuántica termina al capturar el rey rival.', 'A quantum game ends by capturing the enemy king.'), explanation: t('El rey puede entrar en casillas atacadas, aunque hacerlo sea arriesgado.', 'The king may enter attacked squares, although doing so is risky.') },
    ],
  },
  {
    id: 'quantum-split', course: 'quantum', skillId: 'quantum.split', accent: 'quantum',
    title: t('Split', 'Split'),
    summary: t('Divide una pieza entre dos destinos legales.', 'Divide a piece between two legal targets.'),
    misconceptions: [
      t('El split permite capturar dos piezas a la vez.', 'A split can capture two pieces at once.'),
      t('Los dos destinos pueden estar ocupados por aliados.', 'Both targets may contain friendly pieces.'),
    ],
    facts: [
      { title: t('Piezas permitidas', 'Eligible pieces'), summary: t('Solo las piezas no peón pueden dividirse.', 'Only non-pawn pieces may split.'), correct: t('Caballo, alfil, torre, dama y rey pueden hacer split legal.', 'Knight, bishop, rook, queen and king may make a legal split.'), explanation: t('Cada destino debe respetar el patrón de movimiento de la pieza.', 'Each target must respect the piece movement pattern.') },
      { title: t('Dos destinos', 'Two targets'), summary: t('Elige dos casillas legales y vacías.', 'Choose two legal empty squares.'), correct: t('Un split se confirma después de seleccionar dos destinos distintos.', 'A split is confirmed after selecting two different targets.'), explanation: t('La acción no puede utilizarse como captura directa.', 'The action cannot be used as a direct capture.') },
      { title: t('Reparto', 'Distribution'), summary: t('La rama seleccionada reparte su probabilidad.', 'The selected branch distributes its probability.'), correct: t('Un estado al 100% suele convertirse en dos ramas del 50%.', 'A 100% state usually becomes two 50% branches.'), explanation: t('Dividir una rama menor reparte únicamente la probabilidad de esa rama.', 'Splitting a smaller branch distributes only that branch probability.') },
      { title: t('Coste estratégico', 'Strategic cost'), summary: t('Ganas alcance y pierdes certeza.', 'You gain reach and lose certainty.'), correct: t('Un split es útil cuando ambas ramas crean amenazas valiosas.', 'A split is useful when both branches create valuable threats.'), explanation: t('Una rama pasiva puede convertirse en una debilidad medible.', 'A passive branch can become a measurable weakness.') },
    ],
  },
  {
    id: 'quantum-merge', course: 'quantum', skillId: 'quantum.merge', accent: 'merge',
    title: t('Fusión', 'Merge'),
    summary: t('Reúne ramas en una casilla común.', 'Recombine branches on a common square.'),
    misconceptions: [
      t('Solo una de las ramas necesita alcanzar el destino.', 'Only one branch needs to reach the target.'),
      t('La fusión puede capturar una pieza rival.', 'A merge can capture an enemy piece.'),
    ],
    facts: [
      { title: t('Destino común', 'Common target'), summary: t('Todas las ramas deben poder llegar.', 'Every branch must be able to reach it.'), correct: t('La fusión exige una casilla vacía legal desde cada rama.', 'A merge requires an empty legal square from every branch.'), explanation: t('Si una rama está bloqueada, el destino no aparece como opción.', 'If one branch is blocked, the target is not offered.') },
      { title: t('Estado final', 'Final state'), summary: t('La pieza recupera una única ubicación.', 'The piece returns to one location.'), correct: t('Después de fusionar, la pieza queda al 100% en el destino.', 'After merging, the piece is 100% on the target.'), explanation: t('La identidad se conserva y desaparecen las ramas anteriores.', 'Identity is preserved and the previous branches disappear.') },
      { title: t('Sin captura', 'No capture'), summary: t('Fusionar reorganiza, no ataca.', 'Merging reorganises, it does not attack.'), correct: t('El destino de fusión debe estar vacío.', 'The merge target must be empty.'), explanation: t('Para capturar hay que volver al modo clásico.', 'To capture, return to classical mode.') },
      { title: t('Recuperar certeza', 'Recover certainty'), summary: t('La fusión reduce exposición a mediciones.', 'A merge reduces exposure to measurement.'), correct: t('Fusiona cuando una ubicación clara vale más que mantener dos amenazas.', 'Merge when one clear location is worth more than keeping two threats.'), explanation: t('En Coherencia limitada, fusionar también libera capacidad.', 'In Coherence limited, merging also frees capacity.') },
    ],
  },
  {
    id: 'quantum-measurement', course: 'quantum', skillId: 'quantum.measurement', accent: 'quantum',
    title: t('Medición y captura', 'Measurement and capture'),
    summary: t('Calcula qué se mide y qué resultados son posibles.', 'Calculate what is measured and which outcomes are possible.'),
    misconceptions: [
      t('Girar más fuerte cambia el resultado de la ruleta.', 'Spinning harder changes the roulette result.'),
      t('Una captura cuántica siempre elimina al defensor.', 'A quantum capture always removes the defender.'),
    ],
    facts: [
      { title: t('Atacante clásico', 'Classical attacker'), summary: t('Contra una rama, se mide al defensor.', 'Against a branch, the defender is measured.'), correct: t('La captura continúa solo si la pieza defensora estaba en esa casilla.', 'The capture continues only if the defender was on that square.'), explanation: t('Si no estaba, el atacante completa el movimiento sin capturar esa pieza.', 'If it was absent, the attacker completes the move without capturing that piece.') },
      { title: t('Atacante cuántico', 'Quantum attacker'), summary: t('Primero debe confirmarse su presencia.', 'Its presence must be confirmed first.'), correct: t('Si el atacante colapsa ausente, la secuencia termina.', 'If the attacker collapses absent, the sequence ends.'), explanation: t('No se consume una medición defensora innecesaria.', 'No unnecessary defender measurement is consumed.') },
      { title: t('Dos piezas cuánticas', 'Two quantum pieces'), summary: t('La captura puede tener dos pasos.', 'The capture may have two steps.'), correct: t('Se mide primero al atacante y, si está presente, al defensor.', 'The attacker is measured first and, if present, then the defender.'), explanation: t('La traza guarda ambos resultados y el contador aleatorio.', 'The trace stores both outcomes and the random counter.') },
      { title: t('Ruleta reproducible', 'Reproducible roulette'), summary: t('La animación presenta un resultado calculado.', 'The animation presents a calculated result.'), correct: t('La misma semilla y contador producen la misma medición.', 'The same seed and counter produce the same measurement.'), explanation: t('Esto permite replays fiables y sincronización online.', 'This enables reliable replays and online synchronisation.') },
    ],
  },
  {
    id: 'quantum-tunnel', course: 'quantum', skillId: 'quantum.tunnel', accent: 'merge',
    title: t('Efecto túnel', 'Tunnelling'),
    summary: t('Atraviesa un bloqueo cuántico y crea una relación.', 'Cross a quantum blocker and create a relationship.'),
    misconceptions: [
      t('Cualquier pieza puede atravesar cualquier bloqueo.', 'Any piece can cross any blocker.'),
      t('El bloqueo desaparece al ser atravesado.', 'The blocker disappears when crossed.'),
    ],
    facts: [
      { title: t('Piezas lineales', 'Sliding pieces'), summary: t('Alfil, torre y dama recorren líneas.', 'Bishop, rook and queen travel along lines.'), correct: t('Una pieza lineal puede tunelar a través de una rama cuántica compatible.', 'A sliding piece may tunnel through a compatible quantum branch.'), explanation: t('Caballos y peones no utilizan esta mecánica.', 'Knights and pawns do not use this mechanic.') },
      { title: t('Bloqueo válido', 'Valid blocker'), summary: t('El obstáculo debe ser una rama, no una pieza clásica.', 'The obstacle must be a branch, not a classical piece.'), correct: t('Una pieza al 100% sigue bloqueando la línea por completo.', 'A 100% piece still blocks the line completely.'), explanation: t('La posibilidad de ausencia es lo que permite el túnel.', 'The possibility of absence is what enables tunnelling.') },
      { title: t('Entrelazamiento', 'Entanglement'), summary: t('Túnel y bloqueador quedan relacionados.', 'Tunneller and blocker become related.'), correct: t('El motor registra qué rama fue atravesada y desde dónde partió la pieza.', 'The engine records which branch was crossed and where the piece started.'), explanation: t('Una medición posterior puede resolver la relación.', 'A later measurement can resolve the relationship.') },
      { title: t('Riesgo', 'Risk'), summary: t('Ganas movilidad a cambio de dependencia.', 'You gain mobility in exchange for dependency.'), correct: t('Tunela cuando la casilla final compense el futuro colapso relacionado.', 'Tunnel when the target square compensates for the future related collapse.'), explanation: t('En Coherencia limitada, cada túnel activo ocupa una unidad.', 'In Coherence limited, each active tunnel occupies one unit.') },
    ],
  },
  {
    id: 'quantum-entanglement', course: 'quantum', skillId: 'quantum.entanglement', accent: 'quantum',
    title: t('Enroque y entrelazamiento', 'Castling and entanglement'),
    summary: t('Coordina rey y torre en dos configuraciones correlacionadas.', 'Coordinate king and rook across two correlated configurations.'),
    misconceptions: [
      t('Rey y torre se miden de forma independiente.', 'King and rook are measured independently.'),
      t('El enroque cuántico ignora todas las piezas del camino.', 'Quantum castling ignores every piece on the path.'),
    ],
    facts: [
      { title: t('Dos configuraciones', 'Two configurations'), summary: t('Original y enrocada coexisten.', 'Original and castled configurations coexist.'), correct: t('Rey y torre quedan repartidos entre posiciones originales y enrocadas.', 'King and rook are distributed between original and castled positions.'), explanation: t('Las probabilidades correlacionadas representan una sola decisión conjunta.', 'Correlated probabilities represent one joint decision.') },
      { title: t('Correlación', 'Correlation'), summary: t('El resultado de una pieza determina la otra.', 'The outcome of one piece determines the other.'), correct: t('Si el rey colapsa en la configuración enrocada, la torre coincide con ella.', 'If the king collapses in the castled configuration, the rook matches it.'), explanation: t('Nunca queda una combinación incoherente de rey y torre.', 'An inconsistent king-rook combination never remains.') },
      { title: t('Requisitos', 'Requirements'), summary: t('Los derechos de enroque y el camino siguen importando.', 'Castling rights and path still matter.'), correct: t('Rey y torre deben conservar derechos y las casillas necesarias deben estar libres.', 'King and rook must retain rights and the required squares must be empty.'), explanation: t('El modo cuántico elimina el jaque, no la geometría del enroque.', 'Quantum mode removes check, not castling geometry.') },
      { title: t('Colapso conjunto', 'Joint collapse'), summary: t('Capturar una pieza resuelve a su pareja.', 'Capturing one piece resolves its partner.'), correct: t('Una medición del rey o la torre conserva la configuración correspondiente.', 'Measuring king or rook preserves the matching configuration.'), explanation: t('La interfaz debe mostrar el vínculo antes de confirmar una captura.', 'The interface should show the link before confirming a capture.') },
    ],
  },
  {
    id: 'quantum-strategy', course: 'quantum', skillId: 'quantum.strategy', accent: 'merge',
    title: t('Estrategia y coherencia', 'Strategy and coherence'),
    summary: t('Decide cuándo la incertidumbre aporta valor real.', 'Decide when uncertainty creates real value.'),
    misconceptions: [
      t('Crear el máximo número de ramas siempre es óptimo.', 'Creating the maximum number of branches is always optimal.'),
      t('La coherencia se regenera automáticamente cada turno.', 'Coherence regenerates automatically every turn.'),
    ],
    facts: [
      { title: t('Amenazas útiles', 'Useful threats'), summary: t('Cada rama debe contribuir al plan.', 'Every branch should contribute to the plan.'), correct: t('Una buena superposición crea decisiones difíciles en más de una rama.', 'A good superposition creates difficult decisions in more than one branch.'), explanation: t('Las ramas sin función añaden incertidumbre propia sin presionar al rival.', 'Branches without purpose add self-uncertainty without pressuring the opponent.') },
      { title: t('Capacidad', 'Capacity'), summary: t('Las ramas adicionales ocupan coherencia.', 'Additional branches occupy coherence.'), correct: t('Con límite 4, cada rama extra consume una unidad disponible.', 'With limit 4, every extra branch consumes one available unit.'), explanation: t('La capacidad se deriva del tablero y no se gasta permanentemente.', 'Capacity is derived from the board and is not permanently spent.') },
      { title: t('Liberar coherencia', 'Release coherence'), summary: t('Reducir ramas devuelve capacidad.', 'Reducing branches returns capacity.'), correct: t('Fusionar o colapsar libera las unidades que ya no están ocupadas.', 'Merging or collapsing frees units that are no longer occupied.'), explanation: t('No existe regeneración pasiva: hay que simplificar el estado.', 'There is no passive regeneration: the state must be simplified.') },
      { title: t('Plan equilibrado', 'Balanced plan'), summary: t('Alterna certeza e incertidumbre.', 'Alternate certainty and uncertainty.'), correct: t('Reserva capacidad para el momento en que un split cambie la posición.', 'Reserve capacity for the moment when a split changes the position.'), explanation: t('Las jugadas clásicas mantienen opciones sin aumentar el uso de coherencia.', 'Classical moves preserve options without increasing coherence use.') },
    ],
  },
]

const kinds: ActivityKind[] = ['lesson', 'guided', 'puzzle', 'exam']
const kindTitle: Record<ActivityKind, LocalizedText> = {
  lesson: t('Concepto', 'Concept'),
  guided: t('Práctica guiada', 'Guided practice'),
  puzzle: t('Puzle', 'Puzzle'),
  exam: t('Examen', 'Exam'),
}
const estimates = [4, 6, 7, 8]
const difficulties = [1, 2, 2, 3]

function rotateOptions(
  fact: FactSeed,
  misconceptions: [LocalizedText, LocalizedText],
  activityOrder: number,
): { options: LocalizedText[]; correctIndex: number } {
  const base = [fact.correct, ...misconceptions]
  const shift = activityOrder % base.length
  const options = [...base.slice(shift), ...base.slice(0, shift)]
  return { options, correctIndex: options.indexOf(fact.correct) }
}

function buildCourse(seeds: ModuleSeed[]): { modules: AcademyModule[]; lessons: LessonDefinition[] } {
  const modules: AcademyModule[] = seeds.map(({ misconceptions: _m, facts: _f, ...module }, order) => ({
    ...module,
    order,
  }))
  const lessons: LessonDefinition[] = []

  seeds.forEach((seed, moduleOrder) => {
    seed.facts.forEach((fact, activityOrder) => {
      const kind = kinds[activityOrder]
      const id = `${seed.id}-${kind}`
      const previous = activityOrder > 0
        ? `${seed.id}-${kinds[activityOrder - 1]}`
        : moduleOrder > 0
          ? `${seeds[moduleOrder - 1].id}-exam`
          : null
      const { options, correctIndex } = rotateOptions(fact, seed.misconceptions, activityOrder)

      lessons.push({
        id,
        contentVersion: ACADEMY_CONTENT_VERSION,
        course: seed.course,
        moduleId: seed.id,
        moduleOrder,
        activityOrder,
        kind,
        difficulty: difficulties[activityOrder],
        estimatedMinutes: estimates[activityOrder],
        skillIds: [seed.skillId],
        prerequisites: previous ? [previous] : [],
        title: {
          es: `${kindTitle[kind].es}: ${fact.title.es}`,
          en: `${kindTitle[kind].en}: ${fact.title.en}`,
        },
        summary: fact.summary,
        concept: seed.summary,
        hintLadder: [
          fact.summary,
          t(
            `Relaciona la respuesta con el principio central de ${seed.title.es.toLowerCase()}.`,
            `Relate the answer to the core principle of ${seed.title.en.toLowerCase()}.`,
          ),
          t(
            'Descarta las afirmaciones absolutas que contradicen las reglas de la posición.',
            'Discard absolute claims that contradict the rules of the position.',
          ),
          fact.explanation,
        ],
        challenge: {
          prompt: t(
            `¿Qué afirmación describe correctamente «${fact.title.es}»?`,
            `Which statement correctly describes “${fact.title.en}”?`,
          ),
          options,
          correctIndex,
          explanation: fact.explanation,
        },
      })
    })
  })

  return { modules, lessons }
}

const classic = buildCourse(classicSeeds)
const quantum = buildCourse(quantumSeeds)

export const ACADEMY_CONTENT: AcademyContent = academyContentSchema.parse({
  version: ACADEMY_CONTENT_VERSION,
  modules: [...classic.modules, ...quantum.modules],
  lessons: [...classic.lessons, ...quantum.lessons],
})

export const ACADEMY_MODULES = ACADEMY_CONTENT.modules
export const ACADEMY_LESSONS = ACADEMY_CONTENT.lessons

export const ACADEMY_LESSON_BY_ID = new Map(ACADEMY_LESSONS.map((lesson) => [lesson.id, lesson]))
export const ACADEMY_MODULE_BY_ID = new Map(ACADEMY_MODULES.map((module) => [module.id, module]))

export function getCourseModules(course: 'classic' | 'quantum'): AcademyModule[] {
  return ACADEMY_MODULES.filter((module) => module.course === course)
}

export function getModuleLessons(moduleId: string): LessonDefinition[] {
  return ACADEMY_LESSONS.filter((lesson) => lesson.moduleId === moduleId)
}
