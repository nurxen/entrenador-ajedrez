# Entrenador de Ajedrez

Analiza gratis tus partidas de Chess.com con Stockfish 19, como el «Informe de partida» de pago, y te dice en qué fallas más.

- **Clasificación de cada jugada**: Brillante, Gran jugada, Mejor, Excelente, Buena, Teoría, Forzada, Imprecisión, Error, Oportunidad perdida y Error grave.
- **Precisión** de los dos jugadores (método de Lichess) y por fases: apertura, medio juego y final.
- **Por qué fallas**: piezas colgadas, tácticas no vistas, ataques dobles, mates no vistos, errores de plan, técnica de finales y apuros de tiempo (si el PGN trae relojes).
- **Estadísticas** de las últimas 10/25/50 o de todas tus partidas, con blancas o negras, aperturas y evolución del Elo.
- **Entrenador**: plan priorizado con ejercicios gratuitos de Lichess y modo **«Repite tus errores»**, que convierte tus propios fallos en problemas.
- **Importación automática** desde la API pública de Chess.com (sin contraseña) o pegando el PGN.
- El motor corre **en el propio móvil** (WebAssembly). No hay servidor que pagar.
- **App instalable** (PWA) con acceso directo, funciona sin conexión. En Android aparece en el menú *Compartir*.
- **Supabase** opcional para guardar todo en la nube y verlo desde cualquier dispositivo.

### Novedades de la versión 3

- **Nueva estética** de salón de torneo de los años sesenta: papel marfil, nogal, mostaza y verde azulado, con tipografía de época y las jugadas escritas como en una planilla. Las fuentes van incluidas en la app, así que también funciona sin conexión.
- **Tutorial de bienvenida** la primera vez que se abre: conecta tu usuario de Chess.com y explica cada parte de la app. Se puede repetir desde Ajustes, donde también hay una **Guía de uso** con preguntas frecuentes.

### Novedades de la versión 2

- **Aprender**: biblioteca de 33 lecciones en 8 capítulos (táctica, mates, estrategia, finales, tu repertorio, trampas, partidas inmortales y referentes) con ejercicios interactivos y glosario. Todas las posiciones y soluciones están comprobadas con Stockfish (`npm run lecciones`).
- **Práctica de aperturas**: la app juega las jugadas del rival y tú las tuyas en las líneas del Londres y la Caro-Kann.
- **Tablero de análisis** (✥ en la revisión): prueba tus propias jugadas y Stockfish te da las 3 mejores líneas.
- **Uso del reloj**: tiempo por jugada, errores por jugar rápido y con poco tiempo.
- **Salida de teoría**: en qué jugada abandonas el libro en cada apertura.
- **Repetición espaciada** de tus errores (vuelven a 1, 3, 7, 16 y 35 días) y **plan de hoy** con racha de días.
- Lecciones recomendadas según tus errores, en el informe, la revisión y el entrenador.
- **Notación española** (R D T A C) o inglesa y 4 temas de tablero.

## Puesta en marcha (15 minutos)

### 1. Subir a GitHub

```bash
git init && git add . && git commit -m "Entrenador de ajedrez"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/entrenador-ajedrez.git
git push -u origin main
```

En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Cada `push` a `main` publica la app en `https://TU_USUARIO.github.io/entrenador-ajedrez/`.

### 2. Base de datos en Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, pega `supabase/schema.sql` y pulsa **Run**. Crea la tabla `games` con seguridad por filas: cada usuario solo ve sus partidas.
3. **Project Settings → API**: copia la *Project URL* y la clave *anon / publishable*.
4. Dos formas de usarlas:
   - En la app: **Ajustes → Copia en la nube** y pega URL y clave.
   - O fijas en el build: en GitHub, **Settings → Secrets and variables → Actions → Variables**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. En la app, **Ajustes → Crear cuenta** con tu correo. Si Supabase pide confirmar el correo, confírmalo y luego **Entrar**. (Puedes desactivar la confirmación en *Authentication → Providers → Email*.)

La clave *anon* es pública por diseño; lo que protege tus datos son las políticas RLS del esquema.

### 3. Instalar en el móvil

Abre la URL de GitHub Pages en el móvil:
- **Android (Chrome)**: menú ⋮ → *Añadir a pantalla de inicio* (o *Instalar app*).
- **iPhone (Safari)**: botón Compartir → *Añadir a pantalla de inicio*.

## Actualizar desde la versión 1

1. Sube los archivos nuevos al repositorio reemplazando los antiguos (la carpeta `.github` no cambia).
2. En Supabase → SQL Editor ejecuta `supabase/v2-progreso.sql` para guardar también tu progreso de lecciones y repasos.

## Uso diario

1. En **Ajustes** escribe tu usuario de Chess.com y deja activado *traer y analizar las partidas nuevas*.
2. Al terminar una partida, abre la app: descarga las nuevas y analiza las 3 más recientes. En Android también puedes compartir la partida desde Chess.com directamente a la app.
3. Revisa el **Informe**, después la **Revisión** jugada a jugada (⚑ salta a tu siguiente error).
4. Cada pocos días entra en **Entrenador** y resuelve tus posiciones falladas.

La API pública de Chess.com puede tardar unos minutos en mostrar una partida recién terminada. Si no aparece, pega el PGN: *Compartir → PGN → Copiar*.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173 (con --host lo ves desde el móvil en la misma wifi)
npm run build        # genera dist/
npm run analizar samples/partida1.pgn serranilloGm 14   # análisis desde la terminal
npm run lecciones    # valida todas las lecciones con Stockfish
```

| Carpeta | Contenido |
| --- | --- |
| `src/analysis/analyzer.js` | Clasificación de jugadas, precisión, detección de piezas colgadas y tácticas |
| `src/analysis/coach.js` | Estadísticas agregadas y plan de entrenamiento |
| `src/engine.js` | Stockfish en un Web Worker |
| `src/store.js` | IndexedDB local + sincronización con Supabase |
| `src/chesscom.js` | Importación desde la API pública de Chess.com |
| `src/learn/lessons.js` | Contenido de las lecciones (fácil de ampliar) |
| `src/learn/player.js` | Reproductor de lecciones, partidas comentadas y práctica de aperturas |
| `src/progress.js` | Progreso, racha y repetición espaciada |
| `scripts/validate-lessons.mjs` | Comprueba con Stockfish que todas las lecciones son correctas |
| `supabase/schema.sql` | Tablas y políticas de seguridad |

### Cómo se clasifican las jugadas

Cada posición se evalúa con Stockfish (2 líneas) y se convierte a probabilidad de ganar. La pérdida de probabilidad tras tu jugada decide la categoría: ≤2 % excelente, ≤5 % buena, ≤10 % imprecisión, ≤20 % error, >20 % error grave. *Brillante* = jugada casi perfecta que sacrifica material; *Gran jugada* = la única buena cuando las demás pierden mucho; *Oportunidad perdida* = no castigas un error del rival.

Es un motor más ligero que el de Chess.com, así que alguna clasificación puede diferir, sobre todo en posiciones muy complejas. Subir la profundidad en Ajustes lo hace más fiable.

## Licencia

GPL‑3.0, por incluir [Stockfish.js](https://github.com/nmrugg/stockfish.js). Piezas *cburnett* de Colin M. L. Burnett (BSD/GPL). Nombres de aperturas de [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0). Este proyecto no está afiliado a Chess.com.
