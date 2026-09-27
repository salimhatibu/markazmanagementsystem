export const SALAM_SEEN_KEY = "markaz_salam_seen";

let playedThisLoad = false;

export function shouldPlaySalam(): boolean {
  if (playedThisLoad) return false;
  try {
    return sessionStorage.getItem(SALAM_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markSalamPlayed(): void {
  playedThisLoad = true;
  try {
    sessionStorage.setItem(SALAM_SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

type Grain = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drift: number;
  driftTarget: number;
  driftTimer: number;
};

type ReformGrain = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  wave: number;
  phaseOffset: number;
};

type Phase = "hold" | "salam" | "falling" | "pile" | "hiddenFadeIn" | "reform" | "hiddenHold" | "leave";

const settings = {
  startText: "السلام عليكم",
  hiddenText: "Peace be upon you",
  releaseTestsPerFrame: 1500,
  releaseChance: 0.022,
  gravity: 850,
  airDrag: 0.992,
  settleStepsPerFrame: 5,
  introHoldSeconds: 1.6,
  pileHoldSeconds: 0.7,
  hiddenFadeInSeconds: 0.45,
  reformDurationSeconds: 2,
  reformStaggerSeconds: 0.65,
  revealHoldSeconds: 1.6,
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function shuffle(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j]!;
    array[j] = temp!;
  }
}

export type SalamHandle = { stop: () => void };

const canvasHandle = new WeakMap<HTMLCanvasElement, SalamHandle>();

export function startSalamSand(canvas: HTMLCanvasElement, onComplete: () => void): SalamHandle {
  canvasHandle.get(canvas)?.stop();

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    onComplete();
    return { stop() {} };
  }

  let stopped = false;
  let frame = 0;
  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cellSize = window.innerWidth < 720 ? 4 : 3;

  let cols = 0;
  let rows = 0;
  let fixedSalam = new Uint8Array(0);
  let pile = new Uint8Array(0);
  let salamCells: number[] = [];
  let looseCells: number[] = [];
  let falling: Grain[] = [];
  let reforming: ReformGrain[] = [];
  let hiddenAlpha = 0;
  let phase: Phase = "hold";
  let phaseTime = 0;
  let lastTime = performance.now();

  function index(col: number, row: number) {
    return row * cols + col;
  }

  function colFromIndex(i: number) {
    return i % cols;
  }

  function rowFromIndex(i: number) {
    return Math.floor(i / cols);
  }

  function inBounds(col: number, row: number) {
    return col >= 0 && col < cols && row >= 0 && row < rows;
  }

  function buildSalamText() {
    const mask = document.createElement("canvas");
    const maskCtx = mask.getContext("2d");
    if (!maskCtx) return;

    mask.width = w;
    mask.height = h;
    maskCtx.clearRect(0, 0, w, h);
    maskCtx.fillStyle = "#fff";
    maskCtx.textAlign = "center";
    maskCtx.textBaseline = "middle";
    maskCtx.direction = "rtl";

    const family = '"Amiri", "Scheherazade New", "Noto Naskh Arabic", serif';
    let fontSize = Math.min(w * 0.22, h * 0.24, 168);
    maskCtx.font = `700 ${fontSize}px ${family}`;
    const maxWidth = w * 0.9;
    while (fontSize > 40 && maskCtx.measureText(settings.startText).width > maxWidth) {
      fontSize -= 2;
      maskCtx.font = `700 ${fontSize}px ${family}`;
    }

    maskCtx.fillText(settings.startText, w / 2, h * 0.38);

    const image = maskCtx.getImageData(0, 0, w, h).data;
    salamCells = [];
    looseCells = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let alpha = 0;
        const x0 = col * cellSize;
        const y0 = row * cellSize;
        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const x = x0 + dx;
            const y = y0 + dy;
            if (x >= w || y >= h) continue;
            alpha = Math.max(alpha, image[(y * w + x) * 4 + 3] ?? 0);
          }
        }
        if (alpha > 20) {
          const i = index(col, row);
          fixedSalam[i] = 1;
          salamCells.push(i);
          looseCells.push(i);
        }
      }
    }

    shuffle(looseCells);
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / cellSize);
    rows = Math.ceil(h / cellSize);
    fixedSalam = new Uint8Array(cols * rows);
    pile = new Uint8Array(cols * rows);
    falling = [];
    reforming = [];
    hiddenAlpha = 0;
    phase = "hold";
    phaseTime = 0;
    buildSalamText();
  }

  function pileSolid(col: number, row: number) {
    if (row >= rows || col < 0 || col >= cols) return true;
    return pile[index(col, row)] === 1;
  }

  function setPile(col: number, row: number) {
    if (!inBounds(col, row)) return;
    pile[index(col, row)] = 1;
  }

  function releaseOneGrain(cellIndex: number) {
    const col = colFromIndex(cellIndex);
    const row = rowFromIndex(cellIndex);
    fixedSalam[cellIndex] = 0;
    falling.push({
      x: col * cellSize,
      y: row * cellSize,
      vx: rand(-22, 22),
      vy: rand(40, 150),
      drift: rand(-55, 55),
      driftTarget: rand(-85, 85),
      driftTimer: rand(0.18, 0.9),
    });
  }

  function releaseSalam() {
    if (looseCells.length === 0) {
      phase = "falling";
      phaseTime = 0;
      return;
    }

    for (let i = 0; i < settings.releaseTestsPerFrame; i++) {
      if (looseCells.length === 0) break;
      const listIndex = randInt(0, looseCells.length - 1);
      const cellIndex = looseCells[listIndex]!;
      if (fixedSalam[cellIndex] === 0) {
        looseCells.splice(listIndex, 1);
        continue;
      }

      const col = colFromIndex(cellIndex);
      const row = rowFromIndex(cellIndex);
      const belowEmpty = row >= rows - 1 || fixedSalam[index(col, Math.min(row + 1, rows - 1))] === 0;
      const sideEmpty =
        col <= 0 ||
        col >= cols - 1 ||
        fixedSalam[index(Math.max(col - 1, 0), row)] === 0 ||
        fixedSalam[index(Math.min(col + 1, cols - 1), row)] === 0;
      const edgeMultiplier = belowEmpty || sideEmpty ? 3.3 : 1;

      if (Math.random() < settings.releaseChance * edgeMultiplier) {
        releaseOneGrain(cellIndex);
        looseCells.splice(listIndex, 1);
      }
    }
  }

  function settleFallingParticle(p: Grain) {
    let col = Math.floor(p.x / cellSize);
    let row = Math.floor(p.y / cellSize);
    col = Math.max(0, Math.min(cols - 1, col));
    row = Math.max(0, Math.min(rows - 1, row));

    if (!pileSolid(col, row)) {
      setPile(col, row);
      return;
    }
    if (!pileSolid(col - 1, row)) {
      setPile(col - 1, row);
      return;
    }
    if (!pileSolid(col + 1, row)) {
      setPile(col + 1, row);
      return;
    }
    for (let y = row - 1; y >= 0; y--) {
      if (!pileSolid(col, y)) {
        setPile(col, y);
        return;
      }
    }
  }

  function updateFalling(dt: number) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const p = falling[i]!;
      p.driftTimer -= dt;
      if (p.driftTimer <= 0) {
        p.driftTarget = rand(-85, 85);
        p.driftTimer = rand(0.25, 1.2);
      }
      p.drift += (p.driftTarget - p.drift) * dt * 2;
      p.vx += p.drift * dt;
      p.vy += settings.gravity * dt;
      p.vx *= settings.airDrag;
      p.vy *= settings.airDrag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const col = Math.floor(p.x / cellSize);
      const nextRow = Math.floor((p.y + cellSize) / cellSize);
      if (p.x < -60) p.x = 0;
      if (p.x > w + 60) p.x = w - cellSize;

      if (nextRow >= rows || pileSolid(col, nextRow)) {
        settleFallingParticle(p);
        falling.splice(i, 1);
      }
    }

    if (phase === "falling" && falling.length === 0) {
      phase = "pile";
      phaseTime = 0;
    }
  }

  function settlePileCell(col: number, row: number) {
    const current = index(col, row);
    if (pile[current] !== 1) return;
    if (!pileSolid(col, row + 1)) {
      pile[index(col, row + 1)] = 1;
      pile[current] = 0;
      return;
    }
    const preferLeft = Math.random() > 0.5;
    const first = preferLeft ? -1 : 1;
    const second = -first;
    if (!pileSolid(col + first, row + 1)) {
      pile[index(col + first, row + 1)] = 1;
      pile[current] = 0;
      return;
    }
    if (!pileSolid(col + second, row + 1)) {
      pile[index(col + second, row + 1)] = 1;
      pile[current] = 0;
    }
  }

  function settlePile() {
    const leftToRight = Math.random() > 0.5;
    for (let row = rows - 2; row >= 0; row--) {
      if (leftToRight) {
        for (let col = 1; col < cols - 1; col++) settlePileCell(col, row);
      } else {
        for (let col = cols - 2; col >= 1; col--) settlePileCell(col, row);
      }
    }
  }

  function collectPileCells() {
    const cells: number[] = [];
    for (let row = rows - 1; row >= 0; row--) {
      for (let col = 0; col < cols; col++) {
        const i = index(col, row);
        if (pile[i] === 1) cells.push(i);
      }
    }
    return cells;
  }

  function startReform() {
    const pileCells = collectPileCells();
    const targets = salamCells.slice();
    pile.fill(0);
    pileCells.sort((a, b) => rowFromIndex(b) - rowFromIndex(a));
    targets.sort((a, b) => rowFromIndex(b) - rowFromIndex(a));
    const count = Math.min(pileCells.length, targets.length);
    reforming = [];

    for (let i = 0; i < count; i++) {
      const source = pileCells[i]!;
      const target = targets[i]!;
      reforming.push({
        sx: colFromIndex(source) * cellSize,
        sy: rowFromIndex(source) * cellSize,
        tx: colFromIndex(target) * cellSize,
        ty: rowFromIndex(target) * cellSize,
        x: colFromIndex(source) * cellSize,
        y: rowFromIndex(source) * cellSize,
        delay: rand(0, settings.reformStaggerSeconds),
        duration: rand(settings.reformDurationSeconds * 0.75, settings.reformDurationSeconds * 1.15),
        wave: rand(-18, 18),
        phaseOffset: rand(0, Math.PI * 2),
      });
    }

    phase = "reform";
    phaseTime = 0;
  }

  function updateReform() {
    hiddenAlpha = 1;
    let allArrived = true;

    for (const p of reforming) {
      const localTime = phaseTime - p.delay;
      if (localTime <= 0) {
        p.x = p.sx;
        p.y = p.sy;
        allArrived = false;
        continue;
      }
      const t = clamp01(localTime / p.duration);
      const eased = easeInOutCubic(t);
      const arc = Math.sin(eased * Math.PI);
      const wobble = Math.sin(eased * Math.PI * 2 + p.phaseOffset) * p.wave * arc;
      p.x = p.sx + (p.tx - p.sx) * eased + wobble;
      p.y = p.sy + (p.ty - p.sy) * eased - arc * h * 0.08;
      if (t < 1) allArrived = false;
    }

    if (allArrived) {
      for (const cell of salamCells) fixedSalam[cell] = 1;
      reforming = [];
      phase = "hiddenHold";
      phaseTime = 0;
      hiddenAlpha = 1;
    }
  }

  function halt() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
  }

  function complete() {
    if (stopped) return;
    halt();
    onComplete();
  }

  function updatePhase(dt: number) {
    phaseTime += dt;
    if (phase === "hold" && phaseTime >= settings.introHoldSeconds) {
      phase = "salam";
      phaseTime = 0;
    }
    if (phase === "salam") releaseSalam();
    if (phase === "pile" && phaseTime >= settings.pileHoldSeconds) {
      phase = "hiddenFadeIn";
      phaseTime = 0;
      hiddenAlpha = 0;
    }
    if (phase === "hiddenFadeIn") {
      hiddenAlpha = Math.min(1, phaseTime / settings.hiddenFadeInSeconds);
      if (hiddenAlpha >= 1) startReform();
    }
    if (phase === "reform") updateReform();
    if (phase === "hiddenHold" && phaseTime >= settings.revealHoldSeconds) {
      phase = "leave";
      complete();
    }
  }

  function drawHiddenText() {
    if (hiddenAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = hiddenAlpha;
    ctx.fillStyle = "rgb(255, 232, 168)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.max(15, Math.min(20, w * 0.038))}px "IBM Plex Mono", ui-monospace, sans-serif`;
    ctx.fillText(settings.hiddenText, w / 2, h * 0.58);
    ctx.restore();
  }

  function fillSand() {
    ctx.fillStyle = "rgb(236, 204, 116)";
  }

  function drawFallbackText() {
    if (salamCells.length > 0) return;
    ctx.save();
    ctx.fillStyle = "rgb(236, 204, 116)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.font = `700 ${Math.min(w * 0.16, 96)}px "Scheherazade New", "Amiri", serif`;
    ctx.fillText(settings.startText, w / 2, h * 0.4);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    drawFallbackText();
    fillSand();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (fixedSalam[index(col, row)] === 1) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    for (const p of falling) ctx.fillRect(p.x, p.y, cellSize, cellSize);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (pile[index(col, row)] === 1) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    for (const p of reforming) ctx.fillRect(p.x, p.y, cellSize, cellSize);
    drawHiddenText();
  }

  function tick(now: number) {
    if (stopped) return;
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    updatePhase(dt);
    if (stopped) return;
    updateFalling(dt);
    if (phase !== "reform" && phase !== "hiddenHold") {
      for (let i = 0; i < settings.settleStepsPerFrame; i++) settlePile();
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  frame = requestAnimationFrame(tick);

  const handle = {
    stop() {
      halt();
      if (canvasHandle.get(canvas) === handle) canvasHandle.delete(canvas);
    },
  };
  canvasHandle.set(canvas, handle);
  return handle;
}
