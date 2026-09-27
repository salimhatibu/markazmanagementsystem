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

export type SalamPhase = "hold" | "salam" | "falling" | "pile" | "hiddenFadeIn" | "reform" | "hiddenHold" | "leave";

export const SALAM_START_TEXT = "السَّلام عليكُم وَرحمَة الله وَبَرَكَاتُه";
export const SALAM_HIDDEN_TEXT = "Kazi Kwako Fahima!";

const settings = {
  startText: SALAM_START_TEXT,
  hiddenText: SALAM_HIDDEN_TEXT,
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

export function startSalamSand(
  canvas: HTMLCanvasElement,
  onComplete: () => void,
  onPhase?: (phase: SalamPhase) => void,
): SalamHandle {
  canvasHandle.get(canvas)?.stop();

  const surface = canvas.getContext("2d");
  if (!surface) {
    onComplete();
    return { stop() {} };
  }
  const ctx: CanvasRenderingContext2D = surface;

  let stopped = false;
  let frame = 0;
  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const cellSize = shortSide < 800 ? 2 : 3;
  const pink = "rgb(214, 122, 154)";
  const green = "rgb(47, 150, 88)";
  const salamFamily = '"Amiri", "Noto Naskh Arabic", serif';

  let cols = 0;
  let rows = 0;
  let fixedSalam = new Uint8Array(0);
  let pile = new Uint8Array(0);
  let salamCells: number[] = [];
  let looseCells: number[] = [];
  let falling: Grain[] = [];
  let reforming: ReformGrain[] = [];
  let hiddenAlpha = 0;
  let phase: SalamPhase = "hold";
  let phaseTime = 0;
  let lastTime = performance.now();
  let reportedPhase: SalamPhase | null = null;
  let salamLayout: { fontSize: number; lines: string[]; x: number; y: number } | null = null;

  function reportPhase() {
    if (stopped || reportedPhase === phase) return;
    reportedPhase = phase;
    onPhase?.(phase);
  }

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

  function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [text];
  }

  function fitLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxHeight: number,
    family: string,
    weight: string,
    startSize: number,
    minSize: number,
  ): { fontSize: number; lines: string[] } {
    let fontSize = startSize;
    let lines = [text];
    while (fontSize > minSize) {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      lines = wrapLines(ctx, text, maxWidth);
      const block = lines.length * fontSize * 1.32;
      const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
      if (widest <= maxWidth && block <= maxHeight && lines.length <= 4) break;
      fontSize -= 1;
    }
    ctx.font = `${weight} ${fontSize}px ${family}`;
    return { fontSize, lines: wrapLines(ctx, text, maxWidth) };
  }

  function fillCenteredLines(
    target: CanvasRenderingContext2D,
    lines: string[],
    fontSize: number,
    cx: number,
    cy: number,
    family?: string,
    weight = "700",
  ) {
    if (family) target.font = `${weight} ${fontSize}px ${family}`;
    const lineH = fontSize * 1.32;
    const top = cy - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, index) => {
      target.fillText(line, cx, top + index * lineH);
    });
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

    const maxWidth = Math.min(w * 0.86, w - 32);
    const maxHeight = Math.min(h * 0.34, 220);
    const startSize = Math.min(w < 720 ? 34 : 72, h * 0.08, 72);
    const { fontSize, lines } = fitLines(maskCtx, settings.startText, maxWidth, maxHeight, salamFamily, "700", startSize, 18);
    salamLayout = { fontSize, lines, x: w / 2, y: h * 0.36 };
    fillCenteredLines(maskCtx, lines, fontSize, salamLayout.x, salamLayout.y, salamFamily);

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

  function viewportSize() {
    const box = canvas.getBoundingClientRect();
    const view = window.visualViewport;
    const width = box.width || Math.min(window.innerWidth, view?.width ?? window.innerWidth);
    const height = box.height || Math.min(window.innerHeight, view?.height ?? window.innerHeight);
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  }

  function resize() {
    const view = viewportSize();
    w = view.width;
    h = view.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if ("textRendering" in ctx) {
      (ctx as CanvasRenderingContext2D & { textRendering: string }).textRendering = "geometricPrecision";
    }

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
    reportPhase();
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
    window.visualViewport?.removeEventListener("resize", resize);
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

  function sandColor(seed: number) {
    return seed % 9 === 0 ? green : pink;
  }

  function drawFallbackText() {
    if (salamLayout || salamCells.length > 0) return;
    ctx.save();
    ctx.fillStyle = pink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    const maxWidth = Math.min(w * 0.86, w - 32);
    const startSize = Math.min(w < 720 ? 32 : 56, h * 0.08);
    const { fontSize, lines } = fitLines(ctx, settings.startText, maxWidth, h * 0.3, salamFamily, "700", startSize, 18);
    fillCenteredLines(ctx, lines, fontSize, w / 2, h * 0.38, salamFamily);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    drawFallbackText();
    const hideFixedSand = phase === "hold" || phase === "hiddenHold" || phase === "leave";
    if (!hideFixedSand) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = index(col, row);
          if (fixedSalam[i] === 1) {
            ctx.fillStyle = sandColor(i);
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }
    }
    for (const p of falling) {
      ctx.fillStyle = sandColor(Math.floor(p.x + p.y));
      ctx.fillRect(p.x, p.y, cellSize, cellSize);
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = index(col, row);
        if (pile[i] === 1) {
          ctx.fillStyle = sandColor(i + 3);
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
    for (const p of reforming) {
      ctx.fillStyle = sandColor(Math.floor(p.x + p.y * 3));
      ctx.fillRect(p.x, p.y, cellSize, cellSize);
    }
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
    reportPhase();
    draw();
    frame = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
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
