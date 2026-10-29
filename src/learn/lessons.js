// Biblioteca de estudio. Cada lección es una lista de pasos sobre el tablero.
// Paso: { text, fen | line (jugadas desde la posición inicial), moves (para ver paso a paso),
//         arrows: ['e2e4'], marks: ['d5'], puzzle: { solution: 'Nxc7+ Kd7 Nxa8', hint } }
// Si un paso no trae fen ni line, continúa desde donde terminó el anterior.
// Todas las posiciones y soluciones se comprueban con Stockfish: npm run lecciones

export const CHAPTERS = [
  // ───────────────────────── TÁCTICA ─────────────────────────
  {
    id: 'tactica', title: 'Táctica', desc: 'Los golpes que ganan material. A tu nivel, la táctica decide la mayoría de partidas.',
    lessons: [
      {
        id: 'tac-cct', title: 'Jaques, capturas y amenazas', level: 'Básico', tag: ['hanging', 'missedTactic'],
        summary: 'La rutina de 10 segundos que evita la mayoría de errores graves.',
        steps: [
          { line: '', text: 'Antes de cada jugada, los jugadores fuertes repasan siempre lo mismo, en este orden:\n\n1. **Jaques**: ¿qué jaques tengo yo y cuáles tiene el rival?\n2. **Capturas**: ¿qué puedo capturar y qué me puede capturar?\n3. **Amenazas**: ¿qué quiere hacer el rival con su última jugada?\n\nSe llama CCT (en inglés *checks, captures, threats*). Hacerlo tras cada jugada del rival y antes de soltar la tuya es la forma más rápida de subir de 1900 a 2100.' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4', arrows: ['f3e5'], text: 'Un ejemplo de por qué hay que mirar las amenazas. Las negras acaban de jugar 3...Cd4, que parece dejar el peón de e5 sin defensa. El blanco ve una captura gratis…' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5', puzzle: { solution: 'Qg5', hint: 'Busca una jugada de dama que ataque dos cosas a la vez.' }, text: 'Juegan negras. El blanco ha comido en e5 sin mirar qué le podía pasar. ¿Cómo lo castigas?' },
          { moves: ['Bxf7+', 'Kd8', 'O-O', 'Qxe5'], text: 'La dama ataca el caballo de e5 y el peón de g2 a la vez. Si el blanco protege g2, pierde el caballo. Si come en f7 con jaque, el caballo sigue colgando. Es la trampa Blackburne–Shilling: el blanco no hizo CCT.' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7', moves: ['Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'], text: 'Y si el blanco se empeña en comer la torre, llega un mate precioso con el caballo en f3.' },
        ],
      },
      {
        id: 'tac-horquilla', title: 'El ataque doble', level: 'Básico', tag: ['fork', 'missedTactic'],
        summary: 'Una pieza ataca dos objetivos y el rival solo puede salvar uno.',
        steps: [
          { fen: 'r3k2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1', marks: ['e8', 'a8'], text: 'El caballo es el rey de los ataques dobles porque salta y su ataque no se puede tapar. Busca siempre casillas desde las que ataque al rey y a una pieza grande a la vez.' },
          { puzzle: { solution: 'Nxc7+ Kd7 Nxa8', hint: 'El caballo puede dar jaque comiendo un peón.' }, text: 'Juegan blancas. Gana material.' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Nc3 Nxe4 5.Nxe4', puzzle: { solution: 'd5', hint: 'Un peón también puede atacar dos piezas.' }, text: 'Ahora juegan negras. El blanco acaba de recuperar la pieza en e4. Parece que las negras han perdido un caballo… ¿o no?' },
          { moves: ['Bd3', 'dxe4', 'Bxe4'], text: 'El peón ataca a la vez el alfil de c4 y el caballo de e4. Las negras recuperan la pieza. Se llama **el truco de la horquilla** y es una idea de apertura muy útil.' },
          { text: 'Señales de que puede haber un ataque doble:\n\n- Rey y dama en casillas del mismo color, a salto de caballo.\n- Dos piezas sin defensa (en inglés lo resumen como *loose pieces drop off*: las piezas sueltas se caen).\n- Rey y torre en la misma fila o diagonal que tu dama puede alcanzar con jaque.' },
        ],
      },
      {
        id: 'tac-clavada', title: 'La clavada', level: 'Básico', tag: ['missedTactic'],
        summary: 'Una pieza no puede moverse porque detrás hay algo más valioso.',
        steps: [
          { fen: '4k3/1p4pp/2n5/1B6/3P4/8/6PP/4K3 w - - 0 1', arrows: ['b5e8'], text: 'El alfil de b5 **clava** el caballo de c6 contra el rey. Como detrás está el rey, la clavada es **absoluta**: el caballo no se puede mover de ninguna manera.\n\nRegla de oro: **ataca a la pieza clavada**, sobre todo con un peón, porque no puede huir.' },
          { puzzle: { solution: 'd5', hint: 'Un peón puede atacar al caballo clavado.' }, text: 'Juegan blancas. Gana una pieza.' },
          { line: '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6', text: 'Una clavada **relativa** (detrás no hay rey sino dama) se puede romper, a veces con consecuencias brutales. Aquí el alfil de g4 clava el caballo de f3 contra la dama de d1. Las negras creen que el caballo no se puede mover…' },
          { moves: ['Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'], text: 'Es el **mate de Légal** (1750). El blanco rompe la clavada entregando la dama y da mate con las piezas menores. Si las negras hubieran jugado 5...dxe5, ganaban una pieza: la lección es que una clavada relativa no es una clavada de verdad.' },
        ],
      },
      {
        id: 'tac-enfilada', title: 'La enfilada y los rayos X', level: 'Intermedio', tag: ['missedTactic'],
        summary: 'Como la clavada, pero al revés: la pieza valiosa está delante.',
        steps: [
          { fen: '8/1q6/8/3k4/8/8/PP6/4KB2 w - - 0 1', arrows: ['g2b7'], text: 'En la **enfilada** atacas a una pieza valiosa (a menudo con jaque) y, cuando se aparta, capturas la que había detrás en la misma línea.' },
          { puzzle: { solution: 'Bg2+', hint: 'Rey y dama están en la misma diagonal.' }, text: 'Juegan blancas. Gana la dama.' },
          { moves: ['Ke6', 'Bxb7'], text: 'El rey tiene que apartarse de la diagonal y la dama cae. Busca enfiladas cuando el rey rival y su dama o torre comparten fila, columna o diagonal.' },
        ],
      },
      {
        id: 'tac-descubierta', title: 'Ataque y jaque a la descubierta', level: 'Intermedio', tag: ['missedTactic'],
        summary: 'Mueves una pieza y otra que estaba detrás empieza a atacar.',
        steps: [
          { fen: '4k3/8/8/q3N3/8/8/4R3/7K w - - 0 1', arrows: ['e2e8'], text: 'La torre de e2 apunta al rey, pero el caballo está en medio. Cuando el caballo se mueva, el rey quedará en jaque **y además** el caballo puede atacar otra cosa. El rival no puede atender a las dos amenazas.' },
          { puzzle: { solution: 'Nc6+', hint: 'Mueve el caballo a una casilla desde la que ataque a la dama.' }, text: 'Juegan blancas. Gana la dama.' },
          { moves: ['Kd7', 'Nxa5'], text: 'El jaque a la descubierta es la táctica más potente que existe: la pieza que se mueve puede ir a cualquier sitio, incluso a una casilla atacada, porque el rival está obligado a salir del jaque.' },
        ],
      },
      {
        id: 'tac-defensor', title: 'Eliminar al defensor', level: 'Intermedio', tag: ['missedTactic', 'missedMate'],
        summary: 'Si una pieza sostiene la posición rival, cámbiala o desvíala.',
        steps: [
          { fen: 'r2q1rk1/ppp2ppp/5n2/6B1/8/7Q/PPB2PPP/6K1 w - - 0 1', arrows: ['c2h7', 'h3h7'], marks: ['f6'], text: 'Las blancas tienen dama y alfil apuntando a h7. Lo único que impide el mate es el caballo de f6. Cuando una sola pieza defiende algo importante, está **sobrecargada**.' },
          { puzzle: { solution: 'Bxf6', hint: '¿Qué pasa si desaparece el caballo?' }, text: 'Juegan blancas. Elimina al defensor.' },
          { moves: ['Qxf6', 'Qxh7#'], text: 'Si las negras recuperan, mate en h7. Si no recuperan, han perdido una pieza. Pregunta clave en cada posición: **¿qué pieza rival hace demasiado trabajo?**' },
        ],
      },
      {
        id: 'tac-tuyas', title: 'De tus partidas', level: 'Intermedio', tag: ['hanging', 'missedPunish'],
        summary: 'Dos momentos reales de tus partidas del 29 de octubre.',
        steps: [
          { line: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Nf3 Bg4 5.Nc3 Nc6 6.Bb5 e6 7.h3 Bxf3 8.Qxf3 Bb4 9.O-O Qb6 10.Bxc6+ bxc6 11.a3 Bxc3 12.Qxc3 Nf6 13.Bg5 Ne4 14.Qe3 Qxb2 15.Rab1', puzzle: { solution: 'Qc3', hint: 'Cambiar damas cuando vas con un peón de más es buena noticia.' }, text: 'Contra h-o-n-o-r-e-d_o-n-e, con negras. Llevas un peón de más y el rival ataca tu dama. En la partida comiste otro peón con 15...Dxc2, que dio contrajuego al blanco. ¿Qué era más sencillo?' },
          { text: 'Ofrecer el cambio de damas en c3. Con material de más, **cambiar piezas** te acerca al final, donde el peón extra pesa más y el rival no tiene ataque. Es un principio que te ahorrará muchos sustos.' },
          { line: '1.d4 d5 2.Bf4 Bf5 3.e3 e6 4.Bd3 Bxd3 5.Qxd3 Bd6 6.Bxd6 Qxd6 7.Qb5+ Qc6 8.Qxc6+ Nxc6 9.c3 Nf6 10.Nd2 O-O-O 11.Ngf3 h6 12.O-O-O Rhe8 13.h3 e5 14.g4 e4 15.Nh4 Ne7 16.Rde1 g5 17.Ng2 Nd7 18.h4 Rg8 19.hxg5 Rxg5 20.Rxh6 Rxg4 21.Nf4 c6 22.Rh7 Rf8 23.Reh1 Nf6 24.R7h6 Rxf4 25.exf4 Ng4 26.Rh8 Rxh8 27.Rxh8+ Kd7 28.Rh7 Ke6 29.f3 Nf6 30.Rh6 e3 31.Nb3 b6 32.Kd1 Nf5 33.Rh3 Nd6 34.Ke2 Nc4 35.Nc1 Ne8 36.b3 Ncd6 37.Kxe3 Nf5+ 38.Kd3 c5 39.dxc5 bxc5 40.Rh8 Ned6 41.Ra8 c4+ 42.bxc4 dxc4+ 43.Kc2 Nh4 44.Rxa7 Nxf3 45.Ra6 Kd5 46.a4 Ne4 47.Ra7 f5 48.a5 Ne1+ 49.Kb2 Nd3+ 50.Nxd3 cxd3 51.Rd7+ Kc4 52.a6 Nc5', puzzle: { solution: 'Rd4+', hint: 'Antes de comer, mira qué casillas controla el rey negro.' }, text: 'Contra Masterchessnoob07, con blancas. Final ganado. En la partida jugaste 53.Txd3 y dejaste la torre al alcance del rey de c4 (el rival no lo vio). ¿Cuál era la jugada limpia?' },
          { moves: ['Kb5', 'a7'], text: 'Con jaque, la torre se aparta de la casilla atacada y el peón de a corre a coronar. Lección: en los finales, **antes de capturar comprueba qué controla el rey rival**. Los reyes son piezas de ataque y se olvidan con facilidad.' },
        ],
      },
    ],
  },

  // ───────────────────────── MATES ─────────────────────────
  {
    id: 'mates', title: 'Mates', desc: 'Los patrones de mate que tienes que reconocer de un vistazo.',
    lessons: [
      {
        id: 'mat-basicos', title: 'Mates básicos con dama y torre', level: 'Básico', tag: ['missedMate'],
        summary: 'Empuja al rey al borde y cierra la caja.',
        steps: [
          { fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', puzzle: { solution: 'Qh8#', hint: 'El rey negro está en la esquina y tu rey tapa sus salidas.' }, text: 'Con rey y dama contra rey, el método es: con la dama, haz una "caja" cada vez más pequeña (a salto de caballo del rey rival) y acerca tu rey. Cuidado con ahogar. Juegan blancas: mate en 1.' },
          { fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', puzzle: { solution: 'Rh8#', hint: 'La torre da mate en la última fila.' }, text: 'Con torre es igual pero el rey tiene que ponerse **enfrente** del rey rival (en oposición). Juegan blancas: mate en 1.' },
        ],
      },
      {
        id: 'mat-pasillo', title: 'El mate del pasillo', level: 'Básico', tag: ['allowedMate', 'missedMate'],
        summary: 'El rey encerrado por sus propios peones en la última fila.',
        steps: [
          { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', puzzle: { solution: 'Rd8#', hint: 'El rey negro no puede salir de la octava fila.' }, text: 'Juegan blancas. Mate en 1.' },
          { text: 'Los peones de f7, g7 y h7 encierran a su propio rey. Para evitarlo, en algún momento tranquilo del medio juego haz **"luft"** (una salida): h3/h6 o g3/g6. Y antes de mover tu última torre o dama de la primera fila, pregúntate si tu rey queda encerrado.' },
        ],
      },
      {
        id: 'mat-coz', title: 'El mate de la coz', level: 'Intermedio', tag: ['missedMate'],
        summary: 'El caballo da mate a un rey ahogado por sus propias piezas.',
        steps: [
          { fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', puzzle: { solution: 'Nf7#', hint: 'El rey negro no tiene ninguna casilla libre.' }, text: 'Juegan blancas. Mate en 1.' },
          { fen: 'r6k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1', arrows: ['b3g8'], puzzle: { solution: 'Qg8+ Rxg8 Nf7#', hint: 'Sacrifica la dama en una casilla que el rey no pueda tomar.' }, text: 'La versión completa se llama **mate de Philidor**. Juegan blancas: mate en 2.' },
          { line: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2 Ngf6', puzzle: { solution: 'Nd6#', hint: 'El peón de e7 está clavado.' }, text: 'Te interesa especialmente porque sale de **tu Caro-Kann**. Si las negras juegan 5...Cgf6?? en esta línea, ¿qué pasa? Juegan blancas.' },
          { text: 'El peón de e7 está clavado por la dama de e2, así que no puede comer en d6. Con negras, en esta línea juega 5...Cdf6, nunca 5...Cgf6.' },
        ],
      },
      {
        id: 'mat-patrones', title: 'Patrones de mate', level: 'Intermedio', tag: ['missedMate', 'allowedMate'],
        summary: 'Árabe, Anastasia y Boden: tres dibujos para memorizar.',
        steps: [
          { fen: '7k/7R/5N2/8/8/8/8/6K1 b - - 0 1', text: '**Mate árabe**: la torre da jaque pegada al rey en la esquina y el caballo la protege y cubre la casilla de escape. Es uno de los mates documentados más antiguos.' },
          { fen: '8/4N1pk/8/8/8/8/8/6KR b - - 0 1', text: '**Mate de Anastasia**: el caballo en e7 quita las casillas g8 y g6, el propio peón de g7 encierra al rey y la torre da mate por la columna h.' },
          { fen: '2kr4/3n4/B7/8/5B2/8/8/6K1 b - - 0 1', arrows: ['a6c8', 'f4b8'], text: '**Mate de Boden**: dos alfiles en diagonales cruzadas contra el rey enrocado largo. Muy típico cuando se abre la columna b. Si enrocas largo, vigila esas diagonales.' },
        ],
      },
    ],
  },

  // ───────────────────────── ESTRATEGIA ─────────────────────────
  {
    id: 'estrategia', title: 'Estrategia', desc: 'Qué hacer cuando no hay táctica: planes, estructuras y piezas.',
    lessons: [
      {
        id: 'est-principios', title: 'Principios de apertura', level: 'Básico', tag: ['opening'],
        summary: 'Centro, desarrollo, enroque. Y por qué saltárselos se paga.',
        steps: [
          { line: '', marks: ['d4', 'e4', 'd5', 'e5'], text: 'Tres ideas resumen la apertura:\n\n1. **Controla el centro** (las casillas marcadas) con peones y piezas.\n2. **Desarrolla** caballos y alfiles antes de mover la dama o mover dos veces la misma pieza.\n3. **Enroca** pronto para proteger al rey y conectar las torres.' },
          { line: '1.e4 e5 2.Bc4 Nc6 3.Qh5', arrows: ['h5f7', 'c4f7'], text: 'Saltarse los principios a veces "funciona" contra principiantes. Este es el **mate del pastor**: dama y alfil atacan f7, el punto más débil del negro al principio (solo lo defiende el rey).' },
          { puzzle: { solution: 'g6', hint: 'Tapa la diagonal de la dama atacándola.' }, text: 'Juegan negras. ¿Cómo defiendes f7 y a la vez ganas tiempo?' },
          { moves: ['Qf3', 'Nf6'], text: 'La dama blanca tiene que moverse otra vez y las negras siguen desarrollando. Sacar la dama pronto suele hacer perder tiempos.' },
          { line: '1.f3 e5 2.g4', puzzle: { solution: 'Qh4#', hint: 'La diagonal del rey blanco está abierta.' }, text: 'El extremo contrario: debilitar al rey en la apertura. Juegan negras. Mate en 1 (el **mate del loco**, el más rápido posible).' },
        ],
      },
      {
        id: 'est-peones', title: 'Estructuras de peones', level: 'Intermedio', tag: ['positional'],
        summary: 'Peón aislado, doblado y pasado. Los peones marcan el plan.',
        steps: [
          { line: '1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Nf6 7.Bg2 Be7 8.O-O O-O 9.dxc5 Bxc5', marks: ['d5', 'd4'], text: '**Peón aislado** (d5): no tiene peones vecinos que lo defiendan.\n\n- **Para quien lo tiene**: da espacio, casillas en e4 y c4 y juego activo. Busca el ataque en el medio juego.\n- **Para quien lo combate**: bloquéalo con una pieza en la casilla de delante (d4 aquí), cambia piezas y atácalo en el final.' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6', marks: ['c6', 'c7'], text: '**Peones doblados** (c6 y c7): no siempre son malos. Aquí las negras reciben a cambio la pareja de alfiles y columnas abiertas para sus piezas. En el final, en cambio, la mayoría de peones blancos en el flanco de rey puede crear un peón pasado y las negras no.' },
          { fen: '8/5k2/8/3P4/8/8/5K2/8 w - - 0 1', marks: ['d5'], arrows: ['d5d8'], text: '**Peón pasado**: ningún peón rival puede pararlo. Nimzowitsch decía que tiene "un alma criminal": quiere avanzar. Regla práctica: los peones pasados deben empujarse y apoyarse, y contra uno rival lo mejor es bloquearlo con una pieza.' },
        ],
      },
      {
        id: 'est-piezas', title: 'Piezas buenas y piezas malas', level: 'Intermedio', tag: ['positional'],
        summary: 'Alfil bueno y malo, puestos avanzados y columnas abiertas.',
        steps: [
          { line: '1.e4 e6 2.d4 d5 3.e5', marks: ['c8'], arrows: ['c8h3'], text: '**Alfil malo**: el de c8 queda encerrado detrás de sus peones de e6 y d5, todos en casillas blancas. Un alfil es bueno cuando tus peones están en casillas del color contrario. Planes típicos: cambiarlo (…b6 y …Aa6) o sacarlo antes de cerrar la cadena (por eso tu Caro-Kann saca el alfil a f5 antes de …e6).' },
          { line: '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 9.Bxf6 gxf6 10.Nd5', marks: ['d5'], text: '**Puesto avanzado**: una casilla que ningún peón rival puede atacar. El caballo de d5 no puede ser expulsado por peones y domina el tablero. Busca casillas así para tus caballos, especialmente en la 5.ª fila.' },
          { fen: '6k1/1R3ppp/8/8/8/8/5PPP/6K1 b - - 0 1', marks: ['b7'], text: '**Torre en séptima**: ataca los peones desde un lado y encierra al rey. Las torres quieren columnas abiertas y, cuando llegan a la 7.ª fila, suelen decidir el final.' },
          { text: '**La pregunta de oro** cuando no sabes qué jugar: *¿cuál es mi peor pieza y cómo la mejoro?* Mejorar la peor pieza casi nunca es una mala jugada y evita los errores de plan que aparecen en tus estadísticas.' },
        ],
      },
      {
        id: 'est-plan', title: 'Cómo hacer un plan', level: 'Avanzado', tag: ['positional'],
        summary: 'Un método sencillo para las posiciones tranquilas.',
        steps: [
          { line: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nf3 Re8 10.O-O', marks: ['b4', 'b5'], arrows: ['b2b4', 'b4b5'], text: 'Esta es la estructura **Carlsbad**. Las blancas tienen dos peones (a y b) contra tres negros (a, b y c) en el flanco de dama. El plan clásico es el **ataque de minorías**: b4-b5 para crear una debilidad en c6.' },
          { text: 'Método en cuatro pasos para cuando no hay táctica:\n\n1. **Material y amenazas**: ¿hay algo colgando? (CCT)\n2. **Estructura**: ¿dónde están las debilidades de cada bando? ¿Qué rupturas de peón hay?\n3. **Piezas**: ¿cuál es mi peor pieza? ¿Qué casilla quiere?\n4. **Rey**: ¿alguien puede atacar al rey rival?\n\nEl plan sale de ahí: ataca donde está la debilidad o donde tienes más peones, y lleva allí tus piezas.' },
        ],
      },
    ],
  },

  // ───────────────────────── FINALES ─────────────────────────
  {
    id: 'finales', title: 'Finales', desc: 'Lo que hay que saber para convertir ventajas y salvar medios puntos.',
    lessons: [
      {
        id: 'fin-cuadrado', title: 'La regla del cuadrado', level: 'Básico', tag: ['endgame'],
        summary: 'Saber al instante si un rey alcanza a un peón.',
        steps: [
          { fen: '8/8/8/5k2/P7/8/8/6K1 b - - 0 1', marks: ['a4', 'e4', 'e8', 'a8'], text: 'Dibuja un cuadrado desde el peón hasta la casilla de coronación (a4–e4–e8–a8). Si el rey rival puede **entrar en el cuadrado** en su turno, alcanza al peón.\n\nJuegan negras: el rey entra en e5 o e4 y llega a tiempo.' },
          { fen: '8/8/8/5k2/P7/8/8/6K1 w - - 0 1', moves: ['a5', 'Ke6', 'a6', 'Kd7', 'a7', 'Kc7', 'a8=Q'], text: 'Si juegan blancas, el peón avanza y el cuadrado se encoge (a5–d5–d8–a8). El rey de f5 ya no puede entrar y el peón corona.' },
        ],
      },
      {
        id: 'fin-oposicion', title: 'La oposición', level: 'Intermedio', tag: ['endgame'],
        summary: 'El concepto clave de los finales de rey y peón.',
        steps: [
          { fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', text: 'Los reyes están **en oposición** cuando están en la misma columna con una casilla entre ellos. Quien tiene que mover pierde terreno. Con el rey delante de su peón y en la 6.ª fila, el bando fuerte gana siempre.' },
          { puzzle: { solution: 'Kd6', hint: 'No empujes el peón todavía: gana casillas con el rey.' }, text: 'Juegan blancas. Gana.' },
          { moves: ['Kd8', 'e6', 'Ke8', 'e7', 'Kf7', 'Kd7'], text: 'El rey blanco controla la casilla de coronación y el peón pasa. Si las blancas hubieran jugado Rf5?? o empujado mal, el negro se pone delante del peón y hace tablas.' },
          { text: 'Resumen práctico:\n\n- **Rey delante del peón**, no al lado.\n- Con el bando débil, ponte delante del peón y retrocede en línea recta hacia la casilla de coronación.\n- El peón de torre (a o h) casi siempre es tablas si el rey defensor llega a la esquina.' },
        ],
      },
      {
        id: 'fin-lucena', title: 'Posición de Lucena', level: 'Avanzado', tag: ['endgame'],
        summary: 'Cómo ganar el final de torre y peón: "hacer un puente".',
        steps: [
          { fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1', text: 'Es la posición ganadora más importante de los finales de torre. Se atribuye a Luis Ramírez de **Lucena**, autor español de uno de los libros de ajedrez impresos más antiguos (Salamanca, 1497).\n\nEl rey blanco está atrapado delante de su peón. El truco: apartar al rey negro y **construir un puente** con la torre para protegerse de los jaques.' },
          { moves: ['Rd1+', 'Ke7', 'Rd4', 'Ra1', 'Kc7', 'Rc1+', 'Kb6', 'Rb1+', 'Kc6', 'Rc1+', 'Kb5', 'Rb1+', 'Rb4'], text: '1. Jaque para alejar al rey negro.\n2. **Td4**: la torre se coloca en la 4.ª fila.\n3. El rey sale y, cuando acaban los jaques, la torre se interpone en b4: ¡el puente! El peón corona.' },
        ],
      },
      {
        id: 'fin-philidor', title: 'Posición de Philidor', level: 'Avanzado', tag: ['endgame'],
        summary: 'La defensa que salva medio punto en los finales de torre.',
        steps: [
          { fen: '3k4/8/8/3PK3/8/8/7R/r7 b - - 0 1', text: 'Si el rey defensor está delante del peón, se hace tablas con el método de Philidor (siglo XVIII):\n\n1. Torre en la **6.ª fila** (tercera desde tu lado) para que el rey rival no avance.\n2. Cuando el peón llegue a la 6.ª, la torre se va **atrás del todo** y da jaques desde lejos: el rey ya no tiene donde esconderse.' },
          { moves: ['Ra6', 'd6', 'Ra1', 'Ke6', 'Re1+', 'Kd5', 'Rd1+', 'Kc6', 'Rc1+', 'Kb6', 'Rb1+'], text: 'Las negras esperan en la 6.ª fila; cuando el peón avanza ya no protege al rey blanco y los jaques desde atrás son eternos.' },
          { text: 'Otra regla de los finales de torre, de Tarrasch: **la torre va detrás del peón pasado**, tanto si es tuyo (lo empuja) como si es del rival (lo frena desde atrás).' },
        ],
      },
    ],
  },

  // ───────────────────────── REPERTORIO ─────────────────────────
  {
    id: 'repertorio', title: 'Tu repertorio', desc: 'Sistema Londres con blancas y Caro-Kann con negras: las ideas y las líneas para practicar.',
    lessons: [
      {
        id: 'ap-london', title: 'Sistema Londres: el plan', level: 'Intermedio', tag: ['opening'],
        summary: 'Montaje, planes típicos y cómo atacar con h4 o Ce5.',
        steps: [
          { line: '1.d4 d5 2.Bf4 Nf6 3.e3 e6 4.Nf3 c5 5.c3 Nc6 6.Nbd2 Bd6 7.Bg3 O-O 8.Bd3', arrows: ['f3e5', 'd3h7'], text: 'El montaje del Londres: peones en d4, e3 y c3 (la "pirámide"), alfil de casillas negras **fuera de la cadena** en f4 y alfil de casillas blancas apuntando a h7.\n\nPlanes típicos:\n- **Ce5** y f4 (estructura "Stonewall"), con ataque en el flanco de rey.\n- **De2 y e4** para abrir el centro cuando las negras enrocan.\n- **h4–h5** si las negras juegan …h6 o …g6.' },
          { text: 'Ante …Ad6 de las negras, retrocede a g3 (7.Ag3) para no permitir el cambio que deja tu estructura débil. Si cambian en g3, recaptura con el peón de h: la columna h abierta ayuda al ataque.' },
        ],
        drills: [
          { name: 'Londres clásico', side: 'w', line: '1.d4 d5 2.Bf4 Nf6 3.e3 e6 4.Nf3 c5 5.c3 Nc6 6.Nbd2 Bd6 7.Bg3 O-O 8.Bd3' },
          { name: 'Contra …g6 (india de rey)', side: 'w', line: '1.d4 Nf6 2.Bf4 g6 3.e3 Bg7 4.Nf3 O-O 5.Be2 d6 6.h3 c5 7.c3' },
        ],
      },
      {
        id: 'ap-london-simetrica', title: 'Londres contra …Af5', level: 'Intermedio', tag: ['opening'],
        summary: 'La línea de tu partida: cómo castigar el alfil negro.',
        steps: [
          { line: '1.d4 d5 2.Bf4 Bf5', text: 'En tu partida contra Masterchessnoob07 las negras copiaron tu jugada con 2…Af5. Jugaste 3.e3 e6 4.Ad3, que es sólido pero cambia piezas y hace la posición muy igualada.' },
          { line: '1.d4 d5 2.Bf4 Bf5 3.c4', arrows: ['d1b3', 'b3b7'], text: 'Más ambicioso es **3.c4**. Cuando el alfil negro sale de c8, el peón de b7 se queda sin defensa. La idea es **Db3** presionando b7 y d5 a la vez.' },
          { moves: ['e6', 'Nc3', 'c6', 'Qb3', 'Qb6', 'c5'], text: 'Las negras suelen ofrecer el cambio con …Db6, pero 6.c5 gana espacio y empuja a la dama. Las blancas tienen un juego cómodo con más espacio en el flanco de dama.' },
        ],
        drills: [{ name: 'Londres con 3.c4', side: 'w', line: '1.d4 d5 2.Bf4 Bf5 3.c4 e6 4.Nc3 c6 5.Qb3 Qb6 6.c5' }],
      },
      {
        id: 'ap-london-trampa', title: 'Londres: cuidado con …Db6', level: 'Intermedio', tag: ['opening'],
        summary: 'La respuesta incómoda de las negras y cómo afrontarla.',
        steps: [
          { line: '1.d4 d5 2.Bf4 c5 3.e3 Qb6', arrows: ['b6b2'], text: 'La salida de la dama a b6 ataca b2, que el alfil de f4 dejó de defender. Es la prueba más seria del Londres.' },
          { line: '1.d4 d5 2.Bf4 c5 3.e3 Qb6 4.Nc3', moves: ['Qxb2', 'Nb5'], arrows: ['b5c7'], text: 'Respuesta agresiva: **4.Cc3**, entregando el peón. Si 4…Dxb2, 5.Cb5 amenaza Cc7+ ganando la torre. La dama negra queda en peligro y las blancas tienen gran ventaja de desarrollo.' },
          { text: 'Si prefieres algo más tranquilo, 4.Dc1 o 4.Db3 defienden el peón sin complicaciones. Lo que nunca debes hacer es olvidarte de b2: tus estadísticas de "piezas regaladas" empiezan muchas veces en la apertura.' },
        ],
        drills: [{ name: 'Gambito contra …Db6', side: 'w', line: '1.d4 d5 2.Bf4 c5 3.e3 Qb6 4.Nc3 Qxb2 5.Nb5' }],
      },
      {
        id: 'ap-caro', title: 'Caro-Kann: ideas generales', level: 'Intermedio', tag: ['opening'],
        summary: 'Sacar el alfil antes de …e6 y por qué la estructura es tan sólida.',
        steps: [
          { line: '1.e4 c6 2.d4 d5', marks: ['d5'], text: 'La Caro-Kann prepara …d5 con el peón de c6. La gran ventaja frente a la Francesa: **el alfil de c8 sale antes de jugar …e6**, así que no queda encerrado.\n\nEstructura típica: peones en c6, d5 (o e6) y un juego sólido con contraataque en el centro con …c5 o …e5.' },
          { line: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 c5 6.Be3', text: '**Variante del avance** (3.e5): el alfil sale a f5 y luego …e6 y **…c5** para atacar la cadena blanca por la base. Es la línea más popular a nivel de club.' },
          { line: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3', text: '**Variante clásica** (3.Cc3 dxe4 4.Cxe4 Af5): el alfil se retira a g6 ante Cg3. Las blancas ganan espacio con h4–h5 y las negras enrocan largo o se quedan en el centro con una posición muy sólida.' },
          { line: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Bb4', text: '**Panov** (4.c4): da una posición con peón aislado (en d4 o d5 según cómo cambien). Juega activo, presiona d4 y busca el final.' },
        ],
        drills: [
          { name: 'Avance', side: 'b', line: '1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 c5 6.Be3' },
          { name: 'Clásica', side: 'b', line: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7' },
          { name: 'Panov', side: 'b', line: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Bb4' },
        ],
      },
      {
        id: 'ap-caro-cambio', title: 'Caro-Kann: variante del cambio', level: 'Intermedio', tag: ['opening'],
        summary: 'La línea de tu partida contra h-o-n-o-r-e-d_o-n-e.',
        steps: [
          { line: '1.e4 c6 2.d4 d5 3.exd5 cxd5', text: 'Tras 3.exd5 cxd5 la estructura es simétrica. Las negras igualan con facilidad si desarrollan con naturalidad: …Cc6, …Cf6, …Ag4 y …e6.' },
          { line: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7', arrows: ['b3b7'], text: 'Línea principal con 4.Ad3. Ojo a **Db3** atacando b7: la respuesta …Dd7 lo defiende y prepara …e6 o …Ah5–g6. En tu partida el rival jugó 4.Cf3 y 6.Ab5, y tú respondiste perfecto con …Ag4 y …e6.' },
        ],
        drills: [{ name: 'Cambio con 4.Ad3', side: 'b', line: '1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7' }],
      },
    ],
  },

  // ───────────────────────── TRAMPAS ─────────────────────────
  {
    id: 'trampas', title: 'Trampas de apertura', desc: 'Para no caer y, de vez en cuando, ganar en 10 jugadas.',
    lessons: [
      {
        id: 'tr-elefante', title: 'La trampa del elefante', level: 'Intermedio', tag: ['opening'],
        summary: 'En el Gambito de Dama, el caballo de d5 no se puede comer.',
        steps: [
          { line: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5', text: 'Parece que el caballo de f6 está clavado y que las blancas ganan un peón comiendo en d5. Pero la clavada no es real…' },
          { puzzle: { solution: 'Nxd5 Bxd8 Bb4+', hint: 'Entrega la dama: recuperas más.' }, text: 'Juegan negras. Castiga la codicia.' },
          { moves: ['Qd2', 'Kxd8'], text: 'Tras el jaque en b4 la dama blanca tiene que interponerse y las negras recuperan la suya: quedan con una pieza de más. Si juegas con blancas sistemas con c4 y Ag5, recuérdala.' },
        ],
      },
      {
        id: 'tr-coleccion', title: 'Colección de trampas rápidas', level: 'Básico', tag: ['opening'],
        summary: 'Légal, el truco de la horquilla y la Blackburne–Shilling.',
        steps: [
          { line: '1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7', puzzle: { solution: 'Nd5#', hint: 'El último caballo que queda.' }, text: '**Mate de Légal**. Juegan blancas: mate en 1.' },
          { line: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7 Qxg2 6.Rf1 Qxe4+ 7.Be2', puzzle: { solution: 'Nf3#', hint: 'El caballo de d4 tiene la última palabra.' }, text: '**Blackburne–Shilling**. Juegan negras: mate en 1.' },
        ],
      },
    ],
  },

  // ───────────────────────── INMORTALES ─────────────────────────
  {
    id: 'inmortales', title: 'Partidas inmortales', desc: 'Las partidas que todo ajedrecista debería conocer, comentadas jugada a jugada.',
    lessons: [
      {
        id: 'pi-opera', type: 'game', title: 'La partida de la ópera', level: 'Básico',
        white: 'Paul Morphy', black: 'Duque de Brunswick y Conde Isouard', event: 'París (ópera de Norma)', year: 1858, result: '1-0',
        summary: 'La lección perfecta de desarrollo rápido y ataque.',
        pgn: '1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8#',
        notes: {
          '3...Bg4': 'Morphy jugaba en un palco de la ópera de París contra dos aficionados que consultaban entre ellos. Esta clavada parece natural pero cede la pareja de alfiles.',
          '7.Qb3': 'Doble ataque contra f7 y b7. Las blancas ya tienen dama y alfil activos.',
          '10.Nxb5': 'Morphy entrega una pieza para abrir líneas contra el rey negro, que sigue en el centro.',
          '12.O-O-O': 'Enroca y la torre entra en juego por la columna d abierta. Todas las piezas blancas atacan.',
          '13.Rxd7': 'Otra entrega para eliminar defensores.',
          '16.Qb8+': '¡Sacrificio de dama! Obliga al caballo a abandonar d7.',
          '17.Rd8#': 'Mate con las dos últimas piezas. Las negras nunca llegaron a desarrollar el alfil de f8 ni la torre de h8.',
        },
      },
      {
        id: 'pi-inmortal', type: 'game', title: 'La Inmortal', level: 'Intermedio',
        white: 'Adolf Anderssen', black: 'Lionel Kieseritzky', event: 'Londres (partida amistosa)', year: 1851, result: '1-0',
        summary: 'Anderssen entrega las dos torres y la dama para dar mate con piezas menores.',
        pgn: '1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bxb5 Nf6 6.Nf3 Qh6 7.d3 Nh5 8.Nh4 Qg5 9.Nf5 c6 10.g4 Nf6 11.Rg1 cxb5 12.h4 Qg6 13.h5 Qg5 14.Qf3 Ng8 15.Bxf4 Qf6 16.Nc3 Bc5 17.Nd5 Qxb2 18.Bd6 Bxg1 19.e5 Qxa1+ 20.Ke2 Na6 21.Nxg7+ Kd8 22.Qf6+ Nxf6 23.Be7#',
        notes: {
          '2.f4': 'Gambito de rey, la apertura de moda en el siglo XIX: se entrega un peón para abrir la columna f.',
          '11.Rg1': 'Anderssen deja el alfil de b5 colgando: le importa más el desarrollo.',
          '18.Bd6': '¡Deja las dos torres! Este alfil quita la casilla f8 al rey negro.',
          '22.Qf6+': 'Y ahora la dama. El negro tiene casi todo el material, pero ninguna pieza defiende a su rey.',
          '23.Be7#': 'Mate con alfil y dos caballos. La partida recibió su nombre pocos años después y sigue siendo la más famosa de la historia.',
        },
      },
      {
        id: 'pi-siempreviva', type: 'game', title: 'La Siempreviva', level: 'Intermedio',
        white: 'Adolf Anderssen', black: 'Jean Dufresne', event: 'Berlín', year: 1852, result: '1-0',
        summary: 'Una combinación tan profunda que se sigue analizando hoy.',
        pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O d3 8.Qb3 Qf6 9.e5 Qg6 10.Re1 Nge7 11.Ba3 b5 12.Qxb5 Rb8 13.Qa4 Bb6 14.Nbd2 Bb7 15.Ne4 Qf5 16.Bxd3 Qh5 17.Nf6+ gxf6 18.exf6 Rg8 19.Rad1 Qxf3 20.Rxe7+ Nxe7 21.Qxd7+ Kxd7 22.Bf5+ Ke8 23.Bd7+ Kf8 24.Bxe7#',
        notes: {
          '4.b4': 'Gambito Evans: otro peón entregado para ganar tiempo y montar el centro con c3 y d4.',
          '17.Nf6+': 'El sacrificio que abre la columna e.',
          '19.Rad1': 'Una jugada tranquila en mitad del ataque, con la dama negra amenazando mate en g2. Por eso la partida es inmortal: todas las piezas blancas participan.',
          '21.Qxd7+': '¡Sacrificio de dama! El rey negro queda expuesto al jaque doble.',
          '24.Bxe7#': 'Mate con alfiles. Steinitz la llamó "la siempreviva en la corona de laurel de Anderssen".',
        },
      },
      {
        id: 'pi-siglo', type: 'game', title: 'La partida del siglo', level: 'Avanzado',
        white: 'Donald Byrne', black: 'Bobby Fischer', event: 'Nueva York, Rosenwald', year: 1956, result: '0-1',
        summary: 'Fischer, con 13 años, entrega la dama y recibe un ejército a cambio.',
        pgn: '1.Nf3 Nf6 2.c4 g6 3.Nc3 Bg7 4.d4 O-O 5.Bf4 d5 6.Qb3 dxc4 7.Qxc4 c6 8.e4 Nbd7 9.Rd1 Nb6 10.Qc5 Bg4 11.Bg5 Na4 12.Qa3 Nxc3 13.bxc3 Nxe4 14.Bxe7 Qb6 15.Bc4 Nxc3 16.Bc5 Rfe8+ 17.Kf1 Be6 18.Bxb6 Bxc4+ 19.Kg1 Ne2+ 20.Kf1 Nxd4+ 21.Kg1 Ne2+ 22.Kf1 Nc3+ 23.Kg1 axb6 24.Qb4 Ra4 25.Qxb6 Nxd1 26.h3 Rxa2 27.Kh2 Nxf2 28.Re1 Rxe1 29.Qd8+ Bf8 30.Nxe1 Bd5 31.Nf3 Ne4 32.Qb8 b5 33.h4 h5 34.Ne5 Kg7 35.Kg1 Bc5+ 36.Kf1 Ng3+ 37.Ke1 Bb4+ 38.Kd1 Bb3+ 39.Kc1 Ne2+ 40.Kb1 Nc3+ 41.Kc1 Rc2#',
        notes: {
          '11...Na4': 'Fischer ofrece el caballo. Si 12.Cxa4 Cxe4 y las negras recuperan con ataque.',
          '17...Be6': '¡La jugada que hizo famosa la partida! Fischer deja la dama de b6 para lanzar un "molino" de jaques.',
          '18...Bxc4+': 'Empieza el molino: el caballo y el alfil van dando jaques y recogiendo material.',
          '23...axb6': 'Por la dama las negras se llevan dos torres, un alfil y un peón. Su ejército coordinado acaba cazando al rey blanco.',
          '41...Rc2#': 'Mate. Fischer sería campeón del mundo en 1972.',
        },
      },
      {
        id: 'pi-rubinstein', type: 'game', title: 'La Inmortal de Rubinstein', level: 'Avanzado',
        white: 'Georg Rotlewi', black: 'Akiba Rubinstein', event: 'Łódź', year: 1907, result: '0-1',
        summary: 'Dos alfiles apuntando al rey y una cascada de sacrificios.',
        pgn: '1.d4 d5 2.Nf3 e6 3.e3 c5 4.c4 Nc6 5.Nc3 Nf6 6.dxc5 Bxc5 7.a3 a6 8.b4 Bd6 9.Bb2 O-O 10.Qd2 Qe7 11.Bd3 dxc4 12.Bxc4 b5 13.Bd3 Rd8 14.Qe2 Bb7 15.O-O Ne5 16.Nxe5 Bxe5 17.f4 Bc7 18.e4 Rac8 19.e5 Bb6+ 20.Kh1 Ng4 21.Be4 Qh4 22.g3 Rxc3 23.gxh4 Rd2 24.Qxd2 Bxe4+ 25.Qg2 Rh3',
        notes: {
          '14...Bb7': 'Los dos alfiles negros apuntan directamente al rey blanco: b7 y luego b6.',
          '21...Qh4': 'Rubinstein entrega la dama.',
          '22...Rxc3': 'Y una torre. Si 23.Axc3 Axe4+ 24.Dxe4 Dxh2#.',
          '23...Rd2': '¡La otra torre! Desvía a la dama de la defensa de la gran diagonal.',
          '25...Rh3': 'Las blancas abandonaron: no hay forma de evitar Txh2 mate.',
        },
      },
      {
        id: 'pi-short', type: 'game', title: 'El paseo del rey', level: 'Avanzado',
        white: 'Nigel Short', black: 'Jan Timman', event: 'Tilburg', year: 1991, result: '1-0',
        summary: 'Con damas en el tablero, el rey blanco camina hasta g5 para dar mate.',
        pgn: '1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3 g6 5.Bc4 Nb6 6.Bb3 Bg7 7.Qe2 Nc6 8.O-O O-O 9.h3 a5 10.a4 dxe5 11.dxe5 Nd4 12.Nxd4 Qxd4 13.Re1 e6 14.Nd2 Nd5 15.Nf3 Qc5 16.Qe4 Qb4 17.Bc4 Nb6 18.b3 Nxc4 19.bxc4 Re8 20.Rd1 Qc5 21.Qh4 b6 22.Be3 Qc6 23.Bh6 Bh8 24.Rd8 Bb7 25.Rad1 Bg7 26.R8d7 Rf8 27.Bxg7 Kxg7 28.R1d4 Rae8 29.Qf6+ Kg8 30.h4 h5 31.Kh2 Rc8 32.Kg3 Rce8 33.Kf4 Bc8 34.Kg5',
        notes: {
          '24.Rd8': 'La torre entra en la octava fila: las negras están completamente atadas.',
          '29.Qf6+': 'La dama se instala en f6 y el rey negro no se puede mover.',
          '31.Kh2': 'Empieza el paseo. Las negras no pueden hacer nada activo, así que el rey blanco se convierte en una pieza de ataque.',
          '34.Kg5': 'La amenaza es Rh6 y Dg7 mate. Timman abandonó. Lección: cuando el rival no tiene jugadas útiles, **todas** tus piezas pueden atacar, incluido el rey.',
        },
      },
      {
        id: 'pi-kasparov', type: 'game', title: 'La Inmortal de Kasparov', level: 'Avanzado',
        white: 'Garry Kasparov', black: 'Veselin Topalov', event: 'Wijk aan Zee', year: 1999, result: '1-0',
        summary: 'Una torre entregada en la jugada 24 y una caza del rey por todo el tablero.',
        pgn: '1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Be3 Bg7 5.Qd2 c6 6.f3 b5 7.Nge2 Nbd7 8.Bh6 Bxh6 9.Qxh6 Bb7 10.a3 e5 11.O-O-O Qe7 12.Kb1 a6 13.Nc1 O-O-O 14.Nb3 exd4 15.Rxd4 c5 16.Rd1 Nb6 17.g3 Kb8 18.Na5 Ba8 19.Bh3 d5 20.Qf4+ Ka7 21.Rhe1 d4 22.Nd5 Nbxd5 23.exd5 Qd6 24.Rxd4 cxd4 25.Re7+ Kb6 26.Qxd4+ Kxa5 27.b4+ Ka4 28.Qc3 Qxd5 29.Ra7 Bb7 30.Rxb7 Qc4 31.Qxf6 Kxa3 32.Qxa6+ Kxb4 33.c3+ Kxc3 34.Qa1+ Kd2 35.Qb2+ Kd1 36.Bf1 Rd2 37.Rd7 Rxd7 38.Bxc4 bxc4 39.Qxh8 Rd3 40.Qa8 c3 41.Qa4+ Ke1 42.f4 f5 43.Kc1 Rd2 44.Qa7',
        notes: {
          '24.Rxd4': '¡El sacrificio! Kasparov tuvo que ver más de 15 jugadas de profundidad. El rey negro es arrastrado hacia el centro de las piezas blancas.',
          '27.b4+': 'El rey negro llega a a4 y luego hasta d1, la otra punta del tablero.',
          '36.Bf1': 'Una jugada tranquila en plena persecución: el alfil se ofrece para desviar a la dama negra de la defensa de su rey.',
          '44.Qa7': 'Topalov abandonó. Muchos la consideran la mejor partida jugada nunca por un humano.',
        },
      },
    ],
  },

  // ───────────────────────── REFERENTES ─────────────────────────
  {
    id: 'referentes', title: 'Referentes', desc: 'Los jugadores que cambiaron el ajedrez y qué puedes aprender de cada uno.',
    lessons: [
      { id: 'ref-morphy', type: 'bio', title: 'Paul Morphy', years: '1837–1884 · Estados Unidos', summary: 'El genio del desarrollo rápido.',
        text: 'Jugó apenas un par de años en serio y derrotó a todos los fuertes de su época en Europa. Su secreto no era una táctica mágica, sino algo muy sencillo: desarrollaba todas sus piezas y abría líneas cuando el rival aún tenía el rey en el centro.\n\n**Qué copiar**: en posiciones abiertas, desarrollo antes que material. Reproduce la Partida de la ópera.', link: 'pi-opera' },
      { id: 'ref-capablanca', type: 'bio', title: 'José Raúl Capablanca', years: '1888–1942 · Cuba · Campeón 1921–1927', summary: 'La sencillez y los finales.',
        text: 'El jugador más natural de la historia. Recomendaba estudiar los finales antes que nada, porque enseñan cómo trabajan las piezas sin ruido. Ganaba simplificando a finales ligeramente mejores con una técnica impecable.\n\n**Qué copiar**: cuando vayas mejor, cambia piezas y gana el final. Practica los capítulos de Finales.' },
      { id: 'ref-alekhine', type: 'bio', title: 'Alexander Alekhine', years: '1892–1946 · Rusia/Francia · Campeón 1927–1935 y 1937–1946', summary: 'Preparación y ataque.',
        text: 'Uno de los primeros en preparar a fondo las aperturas y a sus rivales. Su estilo combinaba un juego posicional profundo con ataques espectaculares. En 1944, en Gijón, hizo tablas con un niño de 12 años: Arturo Pomar.\n\n**Qué copiar**: conoce bien tus aperturas, como el Londres y la Caro-Kann de tu repertorio.' },
      { id: 'ref-tal', type: 'bio', title: 'Mijaíl Tal', years: '1936–1992 · Letonia · Campeón 1960–1961', summary: 'El mago de Riga.',
        text: 'Sacrificaba piezas por iniciativa aunque el análisis no fuera perfecto, porque sabía lo difícil que es defenderse sobre el tablero con el reloj corriendo. Tú dices que encuentras jugadas muy buenas: Tal es tu referente para eso.\n\n**Qué copiar**: el valor de la iniciativa. Pero recuerda que Tal calculaba muchísimo; su intuición estaba entrenada con miles de horas de táctica.' },
      { id: 'ref-fischer', type: 'bio', title: 'Bobby Fischer', years: '1943–2008 · Estados Unidos · Campeón 1972–1975', summary: 'Claridad y trabajo.',
        text: 'Ganó el campeonato del mundo a Spassky en Reikiavik en plena Guerra Fría. Su juego era claro, con un repertorio de aperturas pequeño que conocía mejor que nadie. Inventó el reloj con incremento y el ajedrez aleatorio (Chess960).\n\n**Qué copiar**: pocas aperturas pero muy bien sabidas, y juego directo.', link: 'pi-siglo' },
      { id: 'ref-kasparov', type: 'bio', title: 'Garry Kasparov', years: '1963 · Rusia · Campeón 1985–2000', summary: 'Energía y dinamismo.',
        text: 'Dominó el ajedrez durante 20 años con una preparación enorme y una energía arrolladora. Su partida contra Topalov de 1999 es para muchos la más bella de la historia.\n\n**Qué copiar**: la iniciativa vale tanto como el material, y la preparación seria se nota.', link: 'pi-kasparov' },
      { id: 'ref-polgar', type: 'bio', title: 'Judit Polgár', years: '1976 · Hungría', summary: 'La mejor jugadora de la historia.',
        text: 'Gran Maestra con 15 años, rompiendo el récord de Fischer. Jugó siempre en torneos absolutos y llegó a estar entre los 10 mejores del mundo. Derrotó a varios campeones del mundo, entre ellos Kasparov. Estilo muy táctico y agresivo.\n\n**Qué copiar**: la táctica diaria. Su método de entrenamiento se basaba en resolver muchísimos problemas.' },
      { id: 'ref-carlsen', type: 'bio', title: 'Magnus Carlsen', years: '1990 · Noruega · Campeón 2013–2023', summary: 'Exprimir posiciones iguales.',
        text: 'Alcanzó la puntuación Elo más alta de la historia (2882). Su gran arma es seguir jugando posiciones igualadas o con ventajas mínimas hasta que el rival se equivoca, sobre todo en los finales.\n\n**Qué copiar**: no ofrezcas tablas en posiciones con algo de juego. Sigue mejorando piezas.' },
      { id: 'ref-espana', type: 'bio', title: 'Referentes españoles', years: 'Lucena · Pomar · Vallejo', summary: 'Del siglo XV a hoy.',
        text: '**Luis Ramírez de Lucena** publicó en Salamanca, hacia 1497, uno de los libros de ajedrez impresos más antiguos, con las reglas modernas de la dama. Su nombre está en la posición más famosa de los finales de torre.\n\n**Arturo Pomar** (1931–2016) fue un niño prodigio: con 12 años hizo tablas con el campeón del mundo Alekhine y en 1962 se convirtió en el primer Gran Maestro español.\n\n**Paco Vallejo** (Menorca, 1982) es uno de los mejores jugadores españoles de la historia, varias veces campeón de España y olímpico durante décadas.', link: 'fin-lucena' },
    ],
  },
];

export const GLOSSARY = [
  ['Ahogado', 'El bando que mueve no está en jaque pero no tiene jugadas legales. Es tablas.'],
  ['Clavada', 'Una pieza no puede moverse sin dejar expuesta otra más valiosa detrás.'],
  ['Columna abierta', 'Columna sin peones. Las torres quieren estar en ellas.'],
  ['Desarrollo', 'Sacar las piezas de sus casillas iniciales a casillas activas.'],
  ['Descubierta', 'Ataque que aparece cuando se aparta una pieza que tapaba una línea.'],
  ['Enfilada', 'Ataque a una pieza valiosa que, al apartarse, deja otra expuesta detrás.'],
  ['Fianchetto', 'Desarrollar el alfil en b2/g2 (o b7/g7) tras mover el peón de caballo.'],
  ['Iniciativa', 'Capacidad de crear amenazas y obligar al rival a responder.'],
  ['Intermedia (zwischenzug)', 'Jugada que se intercala en una secuencia esperada, normalmente un jaque o una amenaza mayor.'],
  ['Luft', 'Casilla de escape para el rey, creada al mover un peón del enroque.'],
  ['Oposición', 'Reyes en la misma línea con un número impar de casillas entre ellos; quien mueve suele ceder terreno.'],
  ['Peón aislado', 'Peón sin peones propios en las columnas vecinas.'],
  ['Peón pasado', 'Peón que ningún peón rival puede detener ni capturar en su avance.'],
  ['Profilaxis', 'Jugada que impide los planes del rival antes de que los ejecute.'],
  ['Puesto avanzado', 'Casilla protegida por un peón propio que ningún peón rival puede atacar.'],
  ['Sobrecarga', 'Una pieza tiene demasiadas tareas defensivas y no puede cumplirlas todas.'],
  ['Tempo', 'Una jugada de tiempo. Ganar un tempo es obligar al rival a perder una jugada.'],
  ['Zugzwang', 'Situación en la que cualquier jugada empeora la posición del que mueve.'],
];

export const allLessons = () => CHAPTERS.flatMap((c) => c.lessons.map((l) => ({ ...l, chapter: c.id })));
export const lessonById = (id) => allLessons().find((l) => l.id === id);
// Para el entrenador: lecciones recomendadas según tus errores
export const lessonsForTag = (tag) => allLessons().filter((l) => (l.tag || []).includes(tag));
