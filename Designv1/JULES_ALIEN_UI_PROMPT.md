# JULES ALIEN UI REDESIGN PROMPT

## ROLE AND OBJECTIVE

You are a senior frontend engineer and visual designer. Your task is to transform
the **Congruence** miniapp's entire UI into an alien-themed, sci-fi aesthetic
that looks stunning on mobile. The game logic, API routes, hooks, and database
stay **100% untouched**. You are only changing visual presentation files.

---

## OPERATING RULES — READ BEFORE TOUCHING ANY FILE

**Rule 1 — Only modify the files explicitly listed in this prompt.**
Do not touch API routes, hooks, DB schema, or any backend file.

**Rule 2 — All UI imports, SDK calls, and hook signatures stay exactly the same.**
Never rename props, change hook APIs, or alter data structures.

**Rule 3 — The font stack must include Google Fonts via `<link>` in `app/layout.tsx`.**
Import: `Orbitron` (display/headings), `Rajdhani` (body/labels), `Share Tech Mono` (mono/numbers).

**Rule 4 — Use Tailwind CSS v4 for all styling (no config file — inline in globals.css).**
Define all custom tokens inside `@layer base` in `globals.css`.

**Rule 5 — Mobile-first. All content must fit within `max-w-[390px] mx-auto`.**
This is a miniapp — it must look perfect at 390px wide, centered on desktop.

**Rule 6 — Build must pass TypeScript. Run `bun run build` after each file.**

---

## DESIGN SYSTEM — ALIEN THEME

### Color Palette (define in globals.css as CSS vars)

```css
--alien-void: #020409;           /* deepest background */
--alien-dark: #060d1a;           /* card backgrounds */
--alien-surface: #0a1628;        /* elevated surfaces */
--alien-border: #0d3060;         /* default borders */
--alien-border-glow: #1a5ca8;    /* glowing borders */
--alien-plasma: #00f0ff;         /* primary cyan accent */
--alien-plasma-dim: #0099aa;     /* dimmed cyan */
--alien-energy: #39ff14;         /* neon green (scores/wins) */
--alien-energy-dim: #1a7a08;     /* dimmed green */
--alien-warning: #ff6b00;        /* orange warnings */
--alien-danger: #ff003c;         /* red errors/danger */
--alien-gold: #ffd700;           /* gold for ranks/streaks */
--alien-text: #c8e8ff;           /* primary text */
--alien-text-dim: #5a8ab0;       /* secondary text */
--alien-text-muted: #2a4a6a;     /* muted/placeholder */
--alien-shimmer: #ffffff15;      /* shimmer overlay */
```

### Typography

```css
--font-display: 'Orbitron', monospace;     /* headings, titles, ranks */
--font-body: 'Rajdhani', sans-serif;       /* body, labels, UI text */
--font-mono: 'Share Tech Mono', monospace; /* numbers, IDs, hashes */
```

### Visual Effects (implement as Tailwind utilities via @layer utilities)

**Glow effects:**
- `.glow-plasma` — `text-shadow: 0 0 10px var(--alien-plasma), 0 0 30px var(--alien-plasma-dim)`
- `.glow-energy` — `text-shadow: 0 0 10px var(--alien-energy), 0 0 25px var(--alien-energy-dim)`
- `.glow-gold` — `text-shadow: 0 0 8px var(--alien-gold)`
- `.border-glow` — `box-shadow: 0 0 0 1px var(--alien-border-glow), 0 0 12px var(--alien-plasma-dim), inset 0 0 12px #00f0ff08`

**Shimmer animation (for buttons, active cells):**
```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.shimmer {
  background: linear-gradient(90deg, transparent 0%, var(--alien-shimmer) 50%, transparent 100%);
  background-size: 200% auto;
  animation: shimmer 2.5s linear infinite;
}
```

**Pulse animation (for active/selected states):**
```css
@keyframes alien-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.alien-pulse { animation: alien-pulse 2s ease-in-out infinite; }
```

**Scan line effect (background texture):**
```css
.scanlines::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 240, 255, 0.015) 2px,
    rgba(0, 240, 255, 0.015) 4px
  );
}
```

**HUD card style:**
```css
.hud-card {
  background: var(--alien-dark);
  border: 1px solid var(--alien-border);
  box-shadow: 0 0 0 1px var(--alien-border-glow), 0 0 20px #00f0ff0a, inset 0 1px 0 #ffffff08;
  border-radius: 8px;
}
```

---

## FILES TO CREATE / REPLACE

### FILE 1: `app/globals.css` (REPLACE ENTIRELY)

Write a complete Tailwind v4 globals.css that:
- Sets `@import "tailwindcss"`
- Defines all CSS variables above in `@layer base` on `:root`
- Sets `body` background to `var(--alien-void)` with `color: var(--alien-text)`
- Sets `font-family` to `var(--font-body)` globally
- Defines all `.glow-*`, `.shimmer`, `.alien-pulse`, `.scanlines`, `.hud-card` utilities in `@layer utilities`
- Defines all `@keyframes` (shimmer, alien-pulse, scan)
- Sets custom scrollbar to match dark theme (thin, plasma-colored)
- Removes default focus rings, replaces with plasma-glow outline: `outline: 1px solid var(--alien-plasma)`

---

### FILE 2: `app/layout.tsx` (REPLACE ENTIRELY)

Replace with a layout that:
- Imports Google Fonts via `<link>` tags in `<head>`: Orbitron (400,700,900), Rajdhani (400,500,600), Share Tech Mono (400)
- Wraps everything in a `<div className="scanlines min-h-screen bg-[var(--alien-void)]">`
- Keeps `AlienProvider` and `QueryClientProvider` wrappers exactly as before
- Centers content with `<div className="max-w-[390px] mx-auto relative">` 
- Adds a subtle animated plasma grid background (CSS-only, positioned absolutely, low opacity, pointer-events-none)

**Plasma grid background (CSS-only, behind content):**
```jsx
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
  <div style={{
    backgroundImage: `
      linear-gradient(var(--alien-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--alien-border) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    opacity: 0.15,
    position: 'absolute',
    inset: 0,
  }} />
</div>
```

---

### FILE 3: `app/page.tsx` (REPLACE ENTIRELY)

This is the main game screen. Transform the UI with these specific changes:

**Keep all logic exactly the same:**
- All `useState`, `useEffect`, `useQuery`, fetch calls stay identical
- All game logic (startGame, handleCellClick, handleNumberInput, handleUndo, handleHint, handleSolve, handleFail) stays identical
- All SDK imports from `@alien_org/react` stay identical
- The `sanitize` import stays identical
- All type definitions stay identical

**Transform the visual structure:**

**A) HOME SCREEN (when `!activeGame`):**

Replace the plain card layout with a HUD-style command center:

1. **Header section:**
   ```jsx
   <div className="text-center pt-8 pb-4">
     {/* Alien glyph decoration */}
     <div className="text-5xl mb-2" style={{filter: 'drop-shadow(0 0 20px var(--alien-plasma))'}}>🛸</div>
     <h1 style={{fontFamily: 'var(--font-display)', letterSpacing: '0.2em'}}
         className="text-2xl font-black text-[var(--alien-plasma)] glow-plasma uppercase tracking-widest">
       CONGRUENCE
     </h1>
     <p style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-dim)] text-xs mt-1 tracking-widest">
       NEURAL GRID PROTOCOL v2.4
     </p>
   </div>
   ```

2. **Rank badge:** Replace plain badge with a glowing hexagonal rank display:
   ```jsx
   <div className="flex justify-center mb-6">
     <div className="hud-card px-6 py-3 text-center border-glow">
       <div style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-dim)] text-[10px] tracking-[0.3em] uppercase mb-1">CLEARANCE LEVEL</div>
       <div style={{fontFamily: 'var(--font-display)'}} className="text-[var(--alien-gold)] text-xl font-black glow-gold">
         {getBadgeName(wallet?.total_points ?? 0)}
       </div>
     </div>
   </div>
   ```

3. **Stat cards:** Replace the 4 plain stat cards with a 2×2 HUD grid:
   - "MISSIONS" → games_played, icon: `⬡`, color: plasma
   - "VICTORIES" → games_won, icon: `◈`, color: energy
   - "STREAK" → current_streak, icon: `⚡`, color: gold
   - "INTEL PTS" → total_points, icon: `◉`, color: plasma

   Each card:
   ```jsx
   <div className="hud-card p-3 flex flex-col items-center gap-1">
     <span className="text-[var(--alien-plasma)] text-lg" style={{filter: 'drop-shadow(0 0 6px var(--alien-plasma))'}}>⬡</span>
     <span style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-plasma)] text-xl font-bold glow-plasma">{wallet?.games_played ?? 0}</span>
     <span style={{fontFamily: 'var(--font-body)'}} className="text-[var(--alien-text-dim)] text-[9px] tracking-widest uppercase">MISSIONS</span>
   </div>
   ```

4. **Level selector:** Replace plain buttons with alien-styled mission briefing buttons:
   ```jsx
   <div className="space-y-2 mb-6">
     <div style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-[10px] tracking-[0.3em] uppercase px-1 mb-3">// SELECT THREAT LEVEL</div>
     {(['cadet','novice','soldier','expert'] as Level[]).map(lvl => (
       <button
         key={lvl}
         onClick={() => setSelectedLevel(lvl)}
         className={`w-full hud-card p-3 flex items-center justify-between transition-all duration-200 ${
           selectedLevel === lvl ? 'border-glow !border-[var(--alien-plasma)]' : 'opacity-60 hover:opacity-90'
         }`}
       >
         <span style={{fontFamily: 'var(--font-display)'}} className={`text-sm uppercase tracking-widest ${selectedLevel === lvl ? 'text-[var(--alien-plasma)] glow-plasma' : 'text-[var(--alien-text-dim)]'}`}>
           {lvl.toUpperCase()}
         </span>
         <span style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-xs">
           {lvl === 'cadet' ? '4×4' : lvl === 'novice' ? '6×6' : lvl === 'soldier' ? '9×9' : '9×9 ✦'}
         </span>
       </button>
     ))}
   </div>
   ```

5. **Launch button:** Replace plain button with a glowing plasma button:
   ```jsx
   <button
     onClick={startGame}
     disabled={!wallet || wallet.trials <= 0 || isStarting}
     className="w-full relative overflow-hidden py-4 rounded-lg font-black uppercase tracking-[0.3em] text-sm transition-all duration-200 disabled:opacity-30"
     style={{
       fontFamily: 'var(--font-display)',
       background: 'linear-gradient(135deg, #003366 0%, #0066cc 50%, #003366 100%)',
       border: '1px solid var(--alien-plasma)',
       color: 'var(--alien-plasma)',
       boxShadow: '0 0 20px var(--alien-plasma-dim), inset 0 0 20px #00f0ff10',
     }}
   >
     <span className="shimmer absolute inset-0" />
     <span className="relative z-10">
       {isStarting ? 'INITIATING...' : `⬡ LAUNCH MISSION · ${wallet?.trials ?? 0} TRIALS`}
     </span>
   </button>
   ```

6. **Trials indicator:**
   ```jsx
   <div className="flex items-center justify-center gap-2 mt-3">
     <span style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-[10px] tracking-widest uppercase">TRIAL CREDITS</span>
     <div className="flex gap-1">
       {Array.from({length: Math.min(wallet?.trials ?? 0, 10)}).map((_, i) => (
         <div key={i} className="w-1.5 h-3 bg-[var(--alien-plasma)] rounded-sm alien-pulse" style={{animationDelay: `${i*0.15}s`, opacity: 0.8}} />
       ))}
       {(wallet?.trials ?? 0) > 10 && <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-plasma)] text-xs ml-1">+{(wallet?.trials ?? 0) - 10}</span>}
     </div>
   </div>
   ```

7. **Leaderboard section:** Replace plain list with a styled intel board:
   ```jsx
   <div className="mt-6 hud-card overflow-hidden">
     <div className="px-4 py-2 border-b border-[var(--alien-border)] flex items-center gap-2">
       <span className="text-[var(--alien-plasma)]">◉</span>
       <span style={{fontFamily: 'var(--font-mono)'}} className="text-[var(--alien-text-dim)] text-[10px] tracking-[0.25em] uppercase">GLOBAL INTEL RANKINGS</span>
     </div>
     {leaderboard.map((entry, i) => (
       <div key={entry.alien_id} className={`px-4 py-2.5 flex items-center gap-3 border-b border-[var(--alien-border)] last:border-0 ${entry.alien_id === myAlienId ? 'bg-[#00f0ff08]' : ''}`}>
         <span style={{fontFamily:'var(--font-mono)'}} className={`text-xs w-6 text-right ${i === 0 ? 'text-[var(--alien-gold)] glow-gold' : 'text-[var(--alien-text-muted)]'}`}>
           {i === 0 ? '▲' : `${i+1}`}
         </span>
         <span style={{fontFamily:'var(--font-mono)'}} className="flex-1 text-xs text-[var(--alien-text-dim)] truncate">
           {sanitize(entry.alien_id)}
         </span>
         <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-plasma)] text-xs glow-plasma">
           {entry.total_points.toLocaleString()}
         </span>
       </div>
     ))}
   </div>
   ```

**B) ACTIVE GAME SCREEN:**

The game board already uses `<GameBoard>` — just wrap it properly:
```jsx
<div className="flex flex-col min-h-screen">
  {/* HUD top bar */}
  <div className="hud-card mx-0 rounded-none border-x-0 border-t-0 px-4 py-2 flex items-center justify-between">
    <button onClick={handleFail} style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-warning)] text-xs tracking-widest uppercase">◄ ABORT</button>
    <div style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-plasma)] text-xs glow-plasma uppercase tracking-widest">
      {activeGame.level.toUpperCase()} PROTOCOL
    </div>
    <div style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text-dim)] text-xs">
      ⬡ {trialsRemaining}
    </div>
  </div>
  <GameBoard ... /> {/* keep all props identical */}
</div>
```

**C) RESULT SCREEN:**

Replace with alien mission debrief style:
```jsx
<div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
  <div className="w-full hud-card border-glow p-6 text-center space-y-4">
    <div style={{fontFamily:'var(--font-display)'}} className={`text-3xl font-black uppercase tracking-widest ${result.won ? 'text-[var(--alien-energy)] glow-energy' : 'text-[var(--alien-danger)]'}`}>
      {result.won ? '◈ MISSION SUCCESS' : '✕ MISSION FAILED'}
    </div>
    {result.won && (
      <div className="space-y-3 mt-4">
        {/* Score breakdown with HUD styling */}
        {[
          {label:'BASE SCORE', val: result.score.base},
          {label:'TIME BONUS', val: `+${result.score.timeBonus}`},
          {label:'HINT PENALTY', val: `-${result.score.hintPenalty}`},
          {label:'ERROR PENALTY', val: `-${result.score.errorPenalty}`},
          {label:'STREAK BONUS', val: `+${result.score.streakBonus}`},
        ].map(({label, val}) => (
          <div key={label} className="flex justify-between items-center border-b border-[var(--alien-border)] pb-2">
            <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-xs tracking-widest uppercase">{label}</span>
            <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text)] text-sm">{val}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2">
          <span style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-plasma)] text-sm uppercase tracking-widest">TOTAL</span>
          <span style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-energy)] text-2xl font-black glow-energy">{result.score.final}</span>
        </div>
      </div>
    )}
    <button onClick={resetGame} style={{fontFamily:'var(--font-display)'}}
      className="w-full mt-4 py-3 rounded-lg border border-[var(--alien-plasma)] text-[var(--alien-plasma)] glow-plasma text-sm uppercase tracking-widest hover:bg-[#00f0ff10] transition-colors">
      ◄ RETURN TO BASE
    </button>
  </div>
</div>
```

---

### FILE 4: `components/GameBoard.tsx` (REPLACE ENTIRELY)

**Keep ALL logic identical.** Only change visual rendering.

**Grid cells** — transform with alien styling:

```jsx
<button
  onClick={() => handleCellClick(row, col)}
  className={`
    relative overflow-hidden
    flex items-center justify-center
    transition-all duration-150 select-none
    ${isSelected ? 'border-[var(--alien-plasma)] bg-[#00f0ff15] border-glow' : ''}
    ${isHighlighted ? 'bg-[#00f0ff08] border-[var(--alien-border-glow)]' : 'border-[var(--alien-border)]'}
    ${isError ? 'bg-[#ff003c10] border-[var(--alien-danger)] text-[var(--alien-danger)]' : ''}
    ${isGiven ? 'bg-[#0a1628]' : 'bg-[#060d1a]'}
    border
  `}
  style={{
    fontFamily: isGiven ? 'var(--font-display)' : 'var(--font-mono)',
    fontSize: cellSize > 50 ? '18px' : '14px',
    color: isError ? 'var(--alien-danger)'
         : isGiven ? 'var(--alien-plasma)'
         : 'var(--alien-text)',
    textShadow: isGiven ? '0 0 8px var(--alien-plasma-dim)' : 'none',
    aspectRatio: '1',
  }}
>
  {/* Shimmer on selected cell */}
  {isSelected && <span className="shimmer absolute inset-0 pointer-events-none" />}
  {/* Cage label (✦N) */}
  {showCageLabel && (
    <span className="absolute top-0.5 left-0.5 text-[7px] leading-none"
          style={{fontFamily:'var(--font-mono)', color: cageColor, opacity: 0.8}}>
      {cageTarget}
    </span>
  )}
  <span className="relative z-10">{cellValue || ''}</span>
</button>
```

**Cage borders** — use colored borders matching cage colors mapped to alien palette:
Replace any warm/standard colors with alien palette colors: use `var(--alien-plasma)`, `var(--alien-energy)`, `var(--alien-gold)`, `var(--alien-warning)` cycling through cages.

**Number pad** — transform with alien styling:
```jsx
<button
  onClick={() => handleNumberInput(n)}
  className="hud-card flex items-center justify-center transition-all duration-150 hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff0a] active:scale-95"
  style={{
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    color: 'var(--alien-text)',
    aspectRatio: '1',
    padding: '8px',
  }}
>
  {n}
</button>
```

**Action buttons (Hint, Undo):**
```jsx
<button style={{fontFamily:'var(--font-mono)', letterSpacing:'0.15em'}}
  className="hud-card px-4 py-2.5 text-[var(--alien-warning)] text-xs uppercase tracking-widest hover:border-[var(--alien-warning)] hover:bg-[#ff6b0010] transition-all duration-150">
  ◈ HINT
</button>
```

**Top info bar inside game:**
```jsx
<div className="flex items-center justify-between px-1 mb-3">
  <div className="hud-card px-3 py-1.5 flex items-center gap-2">
    <span className="text-[var(--alien-plasma)] text-xs">⬡</span>
    <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-plasma)] text-xs glow-plasma">{hintsRemaining}</span>
    <span style={{fontFamily:'var(--font-body)'}} className="text-[var(--alien-text-muted)] text-[9px] uppercase tracking-widest">HINTS</span>
  </div>
  <div className="hud-card px-3 py-1.5 flex items-center gap-2">
    <span className="text-[var(--alien-warning)] text-xs">◉</span>
    <span style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-warning)] text-xs">{errorCount}</span>
    <span style={{fontFamily:'var(--font-body)'}} className="text-[var(--alien-text-muted)] text-[9px] uppercase tracking-widest">ERRORS</span>
  </div>
  <div style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text-dim)] text-xs">{formatTime(elapsed)}</div>
</div>
```

---

### FILE 5: `components/GameWallet.tsx` (REPLACE ENTIRELY)

Transform the trials purchase UI:

**Keep all hook logic, `usePayment`, polling, etc. exactly the same.**

**Transform the visual UI:**

**Store header:**
```jsx
<div className="text-center mb-6">
  <div style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-plasma)] text-lg font-black uppercase tracking-[0.2em] glow-plasma">
    ◈ TRIAL DEPOT
  </div>
  <div style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-[10px] tracking-widest mt-1">
    PURCHASE MISSION CREDITS
  </div>
</div>
```

**Pack cards:**
```jsx
<button onClick={() => handleBuy(pack)} className="w-full hud-card p-4 flex items-center gap-4 hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff06] transition-all duration-200 group">
  <div className="text-3xl" style={{filter:'drop-shadow(0 0 12px var(--alien-plasma))'}}>
    {pack.trials <= 10 ? '◈' : pack.trials <= 27 ? '◈◈' : '◈◈◈'}
  </div>
  <div className="flex-1 text-left">
    <div style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-text)] text-sm uppercase tracking-widest group-hover:text-[var(--alien-plasma)] group-hover:glow-plasma transition-all">
      {pack.trials} TRIALS
    </div>
    <div style={{fontFamily:'var(--font-mono)'}} className="text-[var(--alien-text-muted)] text-xs mt-0.5">{pack.name}</div>
  </div>
  <div style={{fontFamily:'var(--font-display)'}} className="text-[var(--alien-energy)] text-sm font-bold glow-energy">{pack.price}</div>
</button>
```

---

### FILE 6: `features/navigation/components/tab-bar.tsx` (REPLACE ENTIRELY)

Transform the tab bar with alien HUD styling:

```jsx
<nav className="fixed bottom-0 left-0 right-0 z-50">
  <div className="max-w-[390px] mx-auto">
    <div style={{
      background: 'rgba(2, 4, 9, 0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--alien-border)',
      boxShadow: '0 -1px 0 var(--alien-border-glow), 0 -8px 30px #00f0ff08',
    }} className="flex items-center justify-around px-2 py-3 pb-safe-bottom">
      {tabs.map(tab => (
        <button key={tab.href} onClick={() => router.push(tab.href)}
          className="flex flex-col items-center gap-1 px-4 py-1 group transition-all duration-200">
          <span className={`text-xl transition-all duration-200 ${isActive(tab.href) ? 'drop-shadow-[0_0_8px_var(--alien-plasma)]' : 'opacity-40'}`}>
            {tab.icon}
          </span>
          <span style={{fontFamily:'var(--font-mono)', letterSpacing:'0.1em'}}
            className={`text-[9px] uppercase transition-all duration-200 ${isActive(tab.href) ? 'text-[var(--alien-plasma)] glow-plasma' : 'text-[var(--alien-text-muted)]'}`}>
            {tab.label}
          </span>
          {isActive(tab.href) && (
            <div className="w-1 h-1 rounded-full bg-[var(--alien-plasma)] alien-pulse" style={{boxShadow:'0 0 6px var(--alien-plasma)'}} />
          )}
        </button>
      ))}
    </div>
  </div>
</nav>
```

Tab icon mapping:
- Home → `⬡`
- Store → `◈`
- Profile → `◉`
- History → `◌`

---

## VERIFICATION CHECKLIST (run before committing)

- [ ] `bun run build` passes TypeScript with no errors
- [ ] No API route files modified
- [ ] No hook files modified (except GameWallet.tsx UI only)
- [ ] All SDK imports (`@alien_org/react`) unchanged
- [ ] `sanitize()` still wraps `entry.alien_id` in leaderboard
- [ ] Google Fonts loaded in `app/layout.tsx`
- [ ] All color values use CSS variables (not hardcoded hex in JSX)
- [ ] Mobile view at 390px looks correct (no overflow, no horizontal scroll)
- [ ] Dark backgrounds everywhere — no white or light backgrounds

---

## WHAT MAKES THIS DESIGN GREAT

The goal is a game that feels like you're interfacing with alien technology — not a cute game, but a *serious* interstellar threat assessment protocol. Every label is a system designation. Every number is telemetry. Every button press initiates a protocol. The font Orbitron was literally designed for space UI. Rajdhani gives everything a technical militaristic weight. Share Tech Mono makes numbers feel like actual sensor readouts.

The shimmer effects on buttons and selected cells create that "holographic display" feeling. The plasma glow on important numbers makes them feel like they're being projected rather than printed. The scanlines give the whole screen a CRT monitor quality — like you're viewing this through alien technology rather than an app.

Make Jules proud. 🛸
