(() => {
  'use strict';

  const TOTAL_ROUNDS = 10;
  const SWAP_DURATION_MS = 1480;
  const FEEDBACK_DURATION_MS = 1500;
  const CORRECT_FEEDBACK_DURATION_MS = 2600;
  const GAME_OVER_INPUT_GUARD_MS = 600;

  const SVG_TICK = '<svg viewBox="0 0 24 24" class="score-slot__mark" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>';
  const SVG_CROSS = '<svg viewBox="0 0 24 24" class="score-slot__mark" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';
  const SVG_SMILEY_THUMBS_UP = `
    <svg viewBox="0 0 110 80" aria-hidden="true">
      <circle cx="38" cy="42" r="30" fill="#fbbf24" stroke="#f59e0b" stroke-width="3" />
      <circle cx="27" cy="34" r="3.6" fill="#1e293b" />
      <circle cx="49" cy="34" r="3.6" fill="#1e293b" />
      <circle cx="21" cy="43" r="4.2" fill="#fb7185" opacity="0.6" />
      <circle cx="55" cy="43" r="4.2" fill="#fb7185" opacity="0.6" />
      <path d="M25 47 Q38 59 51 47" fill="none" stroke="#1e293b" stroke-width="4" stroke-linecap="round" />
      <g transform="translate(64, 16)">
        <rect x="0" y="22" width="10" height="24" rx="4" fill="#3b82f6" />
        <path d="M10 24 L17 7 C18.5 3 24 4 24 9 L23 18 L34 18 C37.5 18 40 21 39.5 24.5 L37 40 C36.5 43.5 33.5 46 30 46 L10 46 Z"
          fill="#fde047" stroke="#eab308" stroke-width="2.4" stroke-linejoin="round" />
      </g>
    </svg>
  `;
  const SVG_SAD_SMILEY = `
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="30" fill="#fbbf24" stroke="#f59e0b" stroke-width="3" />
      <path d="M23 28 L32 25" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      <path d="M57 28 L48 25" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      <circle cx="29" cy="35" r="3.6" fill="#1e293b" />
      <circle cx="51" cy="35" r="3.6" fill="#1e293b" />
      <path d="M27 54 Q40 43 53 54" fill="none" stroke="#1e293b" stroke-width="4" stroke-linecap="round" />
    </svg>
  `;

  // DOM Elements
  const dom = {
    soundBtn: document.getElementById('soundBtn'),
    soundIconOn: document.getElementById('soundIconOn'),
    soundIconOff: document.getElementById('soundIconOff'),
    restartBtn: document.getElementById('restartBtn'),

    scoreboardTrack: document.getElementById('scoreboardTrack'),

    leftCard: document.getElementById('leftCard'),
    leftDigit: document.getElementById('leftDigit'),
    plusSymbol: document.getElementById('plusSymbol'),
    rightCard: document.getElementById('rightCard'),
    rightDigit: document.getElementById('rightDigit'),
    answerCard: document.getElementById('answerCard'),
    answerText: document.getElementById('answerText'),
    feedbackBanner: document.getElementById('feedbackBanner'),

    // Mode Switch
    modeWriteBtn: document.getElementById('modeWriteBtn'),
    modePadBtn: document.getElementById('modePadBtn'),

    // Handwriting Canvas
    drawPanel: document.getElementById('drawPanel'),
    writeCanvas: document.getElementById('writeCanvas'),
    canvasPlaceholder: document.getElementById('canvasPlaceholder'),
    clearCanvasBtn: document.getElementById('clearCanvasBtn'),
    recognizedValue: document.getElementById('recognizedValue'),
    canvasSubmitBtn: document.getElementById('canvasSubmitBtn'),

    // Number Pad
    numpad: document.getElementById('numpad'),
    digitButtons: Array.from(document.querySelectorAll('[data-digit]')),
    backspaceBtn: document.getElementById('backspaceBtn'),
    submitBtn: document.getElementById('submitBtn'),

    summaryOverlay: document.getElementById('summaryOverlay'),
    summaryTitle: document.getElementById('summaryTitle'),
    summarySubtitle: document.getElementById('summarySubtitle'),
    summaryScoreNumber: document.getElementById('summaryScoreNumber'),
    summaryList: document.getElementById('summaryList'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    confettiLayer: document.getElementById('confettiLayer'),
  };

  // Game State
  const state = {
    rounds: [],
    currentRoundIndex: 0,
    phase: 'AWAITING_FIRST_ANSWER',
    typedAnswer: '',
    feedbackTimerId: null,
    gameOverEnteredAt: 0,
    activeAnimations: [],
    inputMode: 'write',
  };

  // Audio State
  let audioCtx = null;
  let isAudioUnlocked = false;
  let soundEnabled = true;

  try {
    const saved = localStorage.getItem('swap_n_add_sound');
    if (saved !== null) {
      soundEnabled = saved !== 'false';
    }
  } catch {
    soundEnabled = true;
  }

  function updateSoundUI() {
    if (dom.soundIconOn && dom.soundIconOff) {
      dom.soundIconOn.classList.toggle('is-hidden', !soundEnabled);
      dom.soundIconOff.classList.toggle('is-hidden', soundEnabled);
      dom.soundBtn.setAttribute('aria-label', soundEnabled ? 'Mute Sound' : 'Unmute Sound');
      dom.soundBtn.setAttribute('title', soundEnabled ? 'Sound: On' : 'Sound: Off');
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem('swap_n_add_sound', String(soundEnabled));
    } catch {
      // Ignore
    }
    updateSoundUI();
    if (soundEnabled) {
      unlockAudio();
      playTone(659.25, 0.0, 0.12, 'sine', 0.12);
    }
  }

  function getAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!isAudioUnlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        isAudioUnlocked = true;
      } catch {
        // Ignore
      }
    }
  }

  ['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => unlockAudio(), { once: true, passive: true });
  });

  function playTone(freq, startOffset, duration, type = 'sine', volume = 0.14) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playCorrectSound() {
    playTone(523.25, 0.0, 0.16, 'sine', 0.14);
    playTone(659.25, 0.09, 0.18, 'sine', 0.14);
    playTone(783.99, 0.18, 0.28, 'sine', 0.16);
  }

  function playWrongSound() {
    playTone(330, 0.0, 0.18, 'triangle', 0.11);
    playTone(262, 0.12, 0.24, 'triangle', 0.11);
  }

  function playFanfareSound() {
    playTone(523.25, 0.0, 0.15, 'sine', 0.13);
    playTone(659.25, 0.11, 0.15, 'sine', 0.13);
    playTone(783.99, 0.22, 0.15, 'sine', 0.14);
    playTone(1046.5, 0.34, 0.4, 'sine', 0.16);
  }

  // --- Round Generation ---
  function generateRounds(count) {
    const pairs = [];
    for (let a = 1; a <= 9; a += 1) {
      for (let b = a + 1; b <= 9; b += 1) {
        pairs.push([a, b]);
      }
    }

    for (let i = pairs.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    return pairs.slice(0, count).map(([a, b]) => {
      const flip = Math.random() < 0.5;
      const x = flip ? a : b;
      const y = flip ? b : a;
      return {
        x,
        y,
        sum: x + y,
        swapped: false,
        firstAnswer: null,
        secondAnswer: null,
        result: null,
      };
    });
  }

  // =========================================================
  // Handwriting Digit Recognition Engine ($P+ Point-Cloud & Topology)
  // =========================================================
  const recognizer = (() => {
    function ls(a, b, n) {
      const res = [];
      const denom = Math.max(1, n - 1);
      for (let i = 0; i < n; i += 1) {
        res.push(a + (b - a) * i / denom);
      }
      return res;
    }

    function resample(points, n = 32) {
      if (!points || points.length <= 1) {
        return points && points.length === 1 ? Array(n).fill(points[0]) : Array(n).fill({ x: 0.5, y: 0.5 });
      }
      let totalLen = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        totalLen += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      }
      if (totalLen === 0) {
        return Array(n).fill(points[0]);
      }
      const interval = totalLen / (n - 1);
      const res = [points[0]];
      let d = 0;
      const pts = points.map((p) => ({ x: p.x, y: p.y }));
      let i = 0;
      while (i < pts.length - 1 && res.length < n) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        const seg = Math.hypot(dx, dy);
        if (d + seg >= interval) {
          const t = (interval - d) / seg;
          const nx = pts[i].x + t * dx;
          const ny = pts[i].y + t * dy;
          res.push({ x: nx, y: ny });
          pts[i] = { x: nx, y: ny };
          d = 0;
        } else {
          d += seg;
          i += 1;
        }
      }
      while (res.length < n) {
        res.push(pts[pts.length - 1]);
      }
      return res;
    }

    function normalize(points) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const w = Math.max(maxX - minX, 1e-4);
      const h = Math.max(maxY - minY, 1e-4);
      return {
        pts: points.map((p) => ({ x: (p.x - minX) / w, y: (p.y - minY) / h })),
        w,
        h,
        aspect: w / h,
        minX,
        maxX,
        minY,
        maxY,
      };
    }

    function pointCloudDist(pts1, pts2) {
      let d1 = 0;
      for (let i = 0; i < pts1.length; i += 1) {
        let minD = Infinity;
        for (let j = 0; j < pts2.length; j += 1) {
          const d = (pts1[i].x - pts2[j].x) ** 2 + (pts1[i].y - pts2[j].y) ** 2;
          if (d < minD) minD = d;
        }
        d1 += Math.sqrt(minD);
      }
      let d2 = 0;
      for (let j = 0; j < pts2.length; j += 1) {
        let minD = Infinity;
        for (let i = 0; i < pts1.length; i += 1) {
          const d = (pts2[j].x - pts1[i].x) ** 2 + (pts2[j].y - pts1[i].y) ** 2;
          if (d < minD) minD = d;
        }
        d2 += Math.sqrt(minD);
      }
      return (d1 + d2) / (pts1.length + pts2.length);
    }

    // Prototype Templates for Digits 0 - 9
    const templates = {};

    // 0: Oval
    templates[0] = [
      resample(ls(0, 2 * Math.PI, 32).map((t) => ({ x: 0.5 + 0.38 * Math.sin(t), y: 0.5 - 0.44 * Math.cos(t) }))),
    ];

    // 1: Straight down & with serif
    templates[1] = [
      resample(ls(0, 1, 32).map((t) => ({ x: 0.5, y: 0.05 + 0.9 * t }))),
      resample(
        ls(0, 1, 8).map((t) => ({ x: 0.35 + 0.15 * t, y: 0.25 - 0.2 * t })).concat(
          ls(0, 1, 24).map((t) => ({ x: 0.5, y: 0.05 + 0.9 * t }))
        )
      ),
    ];

    // 2: Top curve, diagonal down, flat horizontal bottom
    templates[2] = [
      resample(
        ls(-Math.PI * 0.8, Math.PI * 0.2, 12).map((t) => ({ x: 0.5 + 0.32 * Math.cos(t), y: 0.24 + 0.2 * Math.sin(t) })).concat(
          ls(0, 1, 10).map((t) => ({ x: 0.8 - 0.65 * t, y: 0.42 + 0.5 * t })),
          ls(0, 1, 10).map((t) => ({ x: 0.15 + 0.72 * t, y: 0.94 }))
        )
      ),
    ];

    // 3: Top arc, middle cusp, bottom arc
    templates[3] = [
      resample(
        ls(0, 1, 8).map((t) => ({ x: 0.2 + 0.6 * t, y: 0.1 })).concat(
          ls(0, 1, 8).map((t) => ({ x: 0.8 - 0.35 * t, y: 0.1 + 0.4 * t })),
          ls(0, 1, 8).map((t) => ({ x: 0.45 + 0.4 * t, y: 0.5 + 0.2 * t })),
          ls(0, 1, 8).map((t) => ({ x: 0.85 - 0.65 * t, y: 0.7 + 0.24 * t }))
        )
      ),
    ];

    // 4: L-shape and vertical cross down
    templates[4] = [
      resample(
        ls(0, 1, 12).map((t) => ({ x: 0.75 - 0.55 * t, y: 0.08 + 0.55 * t })).concat(
          ls(0, 1, 10).map((t) => ({ x: 0.2 + 0.68 * t, y: 0.63 })),
          ls(0, 1, 10).map((t) => ({ x: 0.72, y: 0.15 + 0.8 * t }))
        )
      ),
    ];

    // 5: Top bar, vertical stem, round bottom belly
    templates[5] = [
      resample(
        ls(0, 1, 8).map((t) => ({ x: 0.78 - 0.55 * t, y: 0.1 })).concat(
          ls(0, 1, 8).map((t) => ({ x: 0.23, y: 0.1 + 0.38 * t })),
          ls(-Math.PI * 0.5, Math.PI * 0.75, 16).map((t) => ({ x: 0.5 + 0.35 * Math.cos(t), y: 0.7 + 0.23 * Math.sin(t) }))
        )
      ),
    ];

    // 6: Starts top-right, curves down into bottom loop
    templates[6] = [
      resample(
        ls(0, 1, 12).map((t) => ({ x: 0.75 - 0.52 * t, y: 0.1 + 0.5 * t })).concat(
          ls(0, 2 * Math.PI, 20).map((t) => ({ x: 0.5 + 0.32 * Math.cos(t), y: 0.68 + 0.24 * Math.sin(t) }))
        )
      ),
    ];

    // 7: Top bar and diagonal down
    templates[7] = [
      resample(
        ls(0, 1, 12).map((t) => ({ x: 0.15 + 0.72 * t, y: 0.1 })).concat(
          ls(0, 1, 20).map((t) => ({ x: 0.87 - 0.55 * t, y: 0.1 + 0.85 * t }))
        )
      ),
    ];

    // 8: Stacked loops / figure-8
    templates[8] = [
      resample(
        ls(0, 2 * Math.PI, 16).map((t) => ({ x: 0.5 + 0.26 * Math.sin(t), y: 0.28 - 0.22 * Math.cos(t) })).concat(
          ls(0, 2 * Math.PI, 16).map((t) => ({ x: 0.5 - 0.3 * Math.sin(t), y: 0.72 + 0.24 * Math.cos(t) }))
        )
      ),
    ];

    // 9: Top loop and stem down
    templates[9] = [
      resample(
        ls(0, 2 * Math.PI, 20).map((t) => ({ x: 0.5 + 0.3 * Math.cos(t), y: 0.32 + 0.24 * Math.sin(t) })).concat(
          ls(0, 1, 12).map((t) => ({ x: 0.8, y: 0.32 + 0.63 * t }))
        )
      ),
    ];

    function recognizeSingleDigit(rawPoints) {
      if (!rawPoints || rawPoints.length < 2) return null;
      const norm = normalize(rawPoints);

      if (norm.aspect < 0.36) {
        return 1;
      }

      const resampled = resample(norm.pts, 32);
      let bestDigit = null;
      let minScore = Infinity;

      for (let d = 0; d <= 9; d += 1) {
        const variants = templates[d] || [];
        for (let v = 0; v < variants.length; v += 1) {
          let dist = pointCloudDist(resampled, variants[v]);

          if (d === 0) {
            const gap = Math.hypot(norm.pts[0].x - norm.pts[norm.pts.length - 1].x, norm.pts[0].y - norm.pts[norm.pts.length - 1].y);
            if (gap < 0.28) {
              dist -= 0.04;
            } else {
              dist += 0.09;
            }
          } else if (d === 1) {
            if (norm.aspect < 0.42) {
              dist -= 0.06;
            } else {
              dist += 0.12;
            }
          } else if (d === 2) {
            const bottomPts = resampled.filter((p) => p.y > 0.85);
            if (bottomPts.length >= 3) {
              const baseWidth = Math.max(...bottomPts.map((p) => p.x)) - Math.min(...bottomPts.map((p) => p.x));
              if (baseWidth > 0.45) dist -= 0.05;
            }
          } else if (d === 3) {
            const midPts = resampled.filter((p) => p.y >= 0.38 && p.y <= 0.62);
            if (midPts.length > 0) {
              const midMinX = Math.min(...midPts.map((p) => p.x));
              if (midMinX < 0.6) dist -= 0.04;
            }
          } else if (d === 7) {
            const topPts = resampled.filter((p) => p.y < 0.24);
            if (topPts.length >= 3) {
              const topW = Math.max(...topPts.map((p) => p.x)) - Math.min(...topPts.map((p) => p.x));
              if (topW > 0.5) dist -= 0.05;
              else dist += 0.07;
            }
          }

          if (dist < minScore) {
            minScore = dist;
            bestDigit = d;
          }
        }
      }

      return bestDigit;
    }

    function clusterStrokes(strokes) {
      if (!strokes || strokes.length === 0) return [];
      if (strokes.length === 1) return [strokes];

      const strokeBoxes = strokes.map((s, idx) => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        s.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
        return {
          idx,
          stroke: s,
          minX,
          maxX,
          minY,
          maxY,
          cx: (minX + maxX) / 2,
          w: maxX - minX,
          h: maxY - minY,
        };
      });

      const totalMinX = Math.min(...strokeBoxes.map((b) => b.minX));
      const totalMaxX = Math.max(...strokeBoxes.map((b) => b.maxX));
      const totalMinY = Math.min(...strokeBoxes.map((b) => b.minY));
      const totalMaxY = Math.max(...strokeBoxes.map((b) => b.maxY));
      const totalW = totalMaxX - totalMinX;
      const totalH = totalMaxY - totalMinY;

      if (totalW < 0.55 * totalH) {
        return [strokes];
      }

      strokeBoxes.sort((a, b) => a.cx - b.cx);

      let bestSplitIdx = -1;
      let maxGap = -Infinity;

      for (let i = 0; i < strokeBoxes.length - 1; i += 1) {
        const leftMaxX = Math.max(...strokeBoxes.slice(0, i + 1).map((b) => b.maxX));
        const rightMinX = Math.min(...strokeBoxes.slice(i + 1).map((b) => b.minX));
        const gap = rightMinX - leftMaxX;
        const leftCx = strokeBoxes.slice(0, i + 1).reduce((sum, b) => sum + b.cx, 0) / (i + 1);
        const rightCx = strokeBoxes.slice(i + 1).reduce((sum, b) => sum + b.cx, 0) / (strokeBoxes.length - i - 1);
        const centerDist = rightCx - leftCx;

        if (gap > 0 || (gap > -0.25 * totalW && centerDist > 0.32 * totalW)) {
          const score = gap + centerDist * 0.45;
          if (score > maxGap) {
            maxGap = score;
            bestSplitIdx = i;
          }
        }
      }

      if (bestSplitIdx !== -1 && maxGap > 0.04 * totalW) {
        const leftStrokes = strokeBoxes.slice(0, bestSplitIdx + 1).map((b) => b.stroke);
        const rightStrokes = strokeBoxes.slice(bestSplitIdx + 1).map((b) => b.stroke);
        return [leftStrokes, rightStrokes];
      }

      return [strokes];
    }

    function recognizeStrokes(strokes) {
      if (!strokes || strokes.length === 0) return null;

      const validStrokes = strokes.filter((s) => {
        if (s.length < 2) return false;
        let len = 0;
        for (let i = 0; i < s.length - 1; i += 1) {
          len += Math.hypot(s[i + 1].x - s[i].x, s[i + 1].y - s[i].y);
        }
        return len > 6;
      });

      if (validStrokes.length === 0) return null;

      const clusters = clusterStrokes(validStrokes);

      if (clusters.length === 1) {
        const flatPts = clusters[0].flat();
        const digit = recognizeSingleDigit(flatPts);
        return digit !== null ? String(digit) : null;
      }

      if (clusters.length >= 2) {
        const leftPts = clusters[0].flat();
        const rightPts = clusters[1].flat();
        const d1 = recognizeSingleDigit(leftPts);
        const d2 = recognizeSingleDigit(rightPts);
        if (d1 !== null && d2 !== null) {
          return `${d1}${d2}`;
        }
        if (d1 !== null) return String(d1);
        if (d2 !== null) return String(d2);
      }

      return null;
    }

    return { recognizeStrokes };
  })();

  // =========================================================
  // Handwriting Canvas Setup & Pointer Interaction
  // =========================================================
  let canvasCtx = null;
  let canvasStrokes = [];
  let currentStroke = [];
  let isDrawing = false;
  let activePenId = null;
  let cssCanvasWidth = 320;
  let cssCanvasHeight = 180;

  function initCanvas() {
    const canvas = dom.writeCanvas;
    if (!canvas) return;

    canvasCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', () => resizeCanvas());

    canvas.addEventListener('pointerdown', (e) => {
      if (!isInputPhase()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // Apple Pencil palm rejection: if drawing with stylus, ignore secondary touch pointers
      if (e.pointerType === 'pen') {
        activePenId = e.pointerId;
      } else if (activePenId !== null && e.pointerType === 'touch') {
        return;
      }

      e.preventDefault();
      unlockAudio();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() };
      currentStroke = [pt];

      dom.canvasPlaceholder.classList.add('is-hidden');

      canvasCtx.beginPath();
      canvasCtx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      canvasCtx.fillStyle = '#38bdf8';
      canvasCtx.fill();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDrawing) return;
      if (activePenId !== null && e.pointerType === 'touch') return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() };
      currentStroke.push(pt);

      if (currentStroke.length >= 2) {
        const p1 = currentStroke[currentStroke.length - 2];
        const p2 = currentStroke[currentStroke.length - 1];

        canvasCtx.beginPath();
        canvasCtx.strokeStyle = '#38bdf8';
        canvasCtx.lineWidth = 6;
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
        canvasCtx.shadowColor = 'rgba(56, 189, 248, 0.45)';
        canvasCtx.shadowBlur = 4;

        canvasCtx.moveTo(p1.x, p1.y);
        canvasCtx.lineTo(p2.x, p2.y);
        canvasCtx.stroke();
      }
    });

    const finishStroke = (e) => {
      if (!isDrawing) return;
      if (e.pointerId === activePenId) {
        activePenId = null;
      }

      isDrawing = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      if (currentStroke.length >= 2) {
        canvasStrokes.push(currentStroke);
        currentStroke = [];
        evaluateHandwriting();
      }
    };

    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
  }

  function resizeCanvas() {
    const canvas = dom.writeCanvas;
    if (!canvas || !canvasCtx) return;

    const rect = canvas.getBoundingClientRect();
    cssCanvasWidth = rect.width || 320;
    cssCanvasHeight = rect.height || 180;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssCanvasWidth * dpr;
    canvas.height = cssCanvasHeight * dpr;

    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    canvasCtx.scale(dpr, dpr);

    redrawCanvas();
  }

  function redrawCanvas() {
    if (!canvasCtx) return;
    canvasCtx.clearRect(0, 0, cssCanvasWidth, cssCanvasHeight);

    if (canvasStrokes.length === 0) {
      dom.canvasPlaceholder.classList.remove('is-hidden');
      return;
    }

    dom.canvasPlaceholder.classList.add('is-hidden');

    canvasCtx.strokeStyle = '#38bdf8';
    canvasCtx.lineWidth = 6;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    canvasCtx.shadowColor = 'rgba(56, 189, 248, 0.45)';
    canvasCtx.shadowBlur = 4;

    canvasStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      canvasCtx.beginPath();
      canvasCtx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i += 1) {
        canvasCtx.lineTo(stroke[i].x, stroke[i].y);
      }
      canvasCtx.stroke();
    });
  }

  function clearCanvas() {
    canvasStrokes = [];
    currentStroke = [];
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, cssCanvasWidth, cssCanvasHeight);
    }
    dom.canvasPlaceholder.classList.remove('is-hidden');
    dom.recognizedValue.textContent = '—';
    state.typedAnswer = '';
    renderStage();
  }

  function evaluateHandwriting() {
    if (!isInputPhase()) return;
    const recognized = recognizer.recognizeStrokes(canvasStrokes);
    if (recognized !== null && recognized !== '') {
      dom.recognizedValue.textContent = recognized;
      state.typedAnswer = recognized;
      renderStage();
    }
  }

  // --- Rendering Helpers ---
  function applyCardAppearance(cardEl, digitEl, value, theme) {
    digitEl.textContent = String(value);
    cardEl.classList.remove('number-card--blue', 'number-card--coral');
    cardEl.classList.add(theme === 'blue' ? 'number-card--blue' : 'number-card--coral');
  }

  function renderScoreboard() {
    dom.scoreboardTrack.innerHTML = '';

    state.rounds.forEach((round, idx) => {
      const li = document.createElement('li');
      li.className = 'score-slot';
      const isCurrent = idx === state.currentRoundIndex && state.phase !== 'GAME_OVER';

      if (round.result === 'tick') {
        li.classList.add('score-slot--tick');
        li.innerHTML = `<span class="score-slot__badge">${idx + 1}</span>${SVG_TICK}`;
        li.setAttribute('aria-label', `Round ${idx + 1}: Correct`);
      } else if (round.result === 'cross') {
        li.classList.add('score-slot--cross');
        li.innerHTML = `<span class="score-slot__badge">${idx + 1}</span>${SVG_CROSS}`;
        li.setAttribute('aria-label', `Round ${idx + 1}: Incorrect`);
      } else {
        if (isCurrent) {
          li.classList.add('score-slot--active');
        }
        li.innerHTML = `<span class="score-slot__num">${idx + 1}</span>`;
        li.setAttribute('aria-label', `Round ${idx + 1}: Pending`);
      }

      dom.scoreboardTrack.appendChild(li);
    });
  }

  function isInputPhase() {
    return state.phase === 'AWAITING_FIRST_ANSWER' || state.phase === 'AWAITING_SECOND_ANSWER';
  }

  function renderStage() {
    const round = state.rounds[state.currentRoundIndex];
    if (!round) return;

    const leftVal = round.swapped ? round.y : round.x;
    const leftTheme = round.swapped ? 'coral' : 'blue';
    const rightVal = round.swapped ? round.x : round.y;
    const rightTheme = round.swapped ? 'blue' : 'coral';

    applyCardAppearance(dom.leftCard, dom.leftDigit, leftVal, leftTheme);
    applyCardAppearance(dom.rightCard, dom.rightDigit, rightVal, rightTheme);

    dom.answerCard.classList.remove('answer-card--correct', 'answer-card--wrong', 'answer-card--typing');

    if (round.result !== null) {
      dom.answerText.textContent = String(round.sum);
      dom.answerCard.classList.add(round.result === 'tick' ? 'answer-card--correct' : 'answer-card--wrong');
    } else if (state.typedAnswer !== '') {
      dom.answerText.textContent = state.typedAnswer;
      dom.answerCard.classList.add('answer-card--typing');
    } else {
      dom.answerText.textContent = '?';
    }

    const canType = isInputPhase();
    dom.numpad.classList.toggle('numpad--locked', !canType);
    dom.digitButtons.forEach((btn) => { btn.disabled = !canType; });
    dom.backspaceBtn.disabled = !canType;
    dom.submitBtn.disabled = !canType;
    dom.canvasSubmitBtn.disabled = !canType;
    dom.clearCanvasBtn.disabled = !canType;

    dom.feedbackBanner.classList.add('is-hidden');
    dom.feedbackBanner.classList.remove('feedback-banner--correct', 'feedback-banner--wrong');

    if (state.phase === 'ROUND_FEEDBACK') {
      dom.feedbackBanner.classList.remove('is-hidden');
      if (round.result === 'tick') {
        dom.feedbackBanner.classList.add('feedback-banner--correct');
        dom.feedbackBanner.textContent = `✓ Correct! ${round.x} + ${round.y} = ${round.y} + ${round.x} = ${round.sum}`;
      } else {
        dom.feedbackBanner.classList.add('feedback-banner--wrong');
        dom.feedbackBanner.textContent = `✗ ${round.x} + ${round.y} = ${round.y} + ${round.x} = ${round.sum}`;
      }
    }
  }

  function nudgeAnswerRequired() {
    dom.answerCard.classList.remove('answer-card--nudge');
    void dom.answerCard.offsetWidth;
    dom.answerCard.classList.add('answer-card--nudge');
  }

  // --- Celebration Confetti & Smileys ---
  function spawnConfetti(showSmiley = false) {
    const colors = ['#2563eb', '#ea580c', '#16a34a', '#f59e0b', '#6366f1', '#ec4899'];
    const rect = dom.answerCard.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    if (showSmiley) {
      const smiley = document.createElement('div');
      smiley.className = 'celebration-smiley';
      smiley.style.left = `${originX}px`;
      smiley.style.top = `${originY}px`;
      smiley.innerHTML = SVG_SMILEY_THUMBS_UP;
      dom.confettiLayer.appendChild(smiley);

      const smileyAnim = smiley.animate(
        [
          { transform: 'translate(-50%, -35%) scale(0.4) rotate(-8deg)', opacity: 0 },
          { transform: 'translate(-50%, -120%) scale(1.12) rotate(4deg)', opacity: 1, offset: 0.25 },
          { transform: 'translate(-50%, -132%) scale(1.05) rotate(-2deg)', opacity: 1, offset: 0.72 },
          { transform: 'translate(-50%, -165%) scale(0.95) rotate(0deg)', opacity: 0 },
        ],
        {
          duration: 2475,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      smileyAnim.onfinish = () => smiley.remove();
    }

    for (let i = 0; i < 24; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.background = colors[i % colors.length];
      dom.confettiLayer.appendChild(piece);

      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.35;
      const dist = 70 + Math.random() * 140;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 40;
      const rot = (Math.random() - 0.5) * 540;

      const anim = piece.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.5) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1) rotate(${rot}deg)`, opacity: 0 },
        ],
        {
          duration: 1688 + Math.random() * 788,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );

      anim.onfinish = () => piece.remove();
    }
  }

  function spawnSadSmiley() {
    const rect = dom.answerCard.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const smiley = document.createElement('div');
    smiley.className = 'sad-smiley';
    smiley.style.left = `${originX}px`;
    smiley.style.top = `${originY}px`;
    smiley.innerHTML = SVG_SAD_SMILEY;
    dom.confettiLayer.appendChild(smiley);

    const anim = smiley.animate(
      [
        { transform: 'translate(-50%, -65%) scale(0.55)', opacity: 0 },
        { transform: 'translate(-50%, -20%) scale(1.05)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, 35%) scale(1)', opacity: 1, offset: 0.72 },
        { transform: 'translate(-50%, 95%) scale(0.92)', opacity: 0 },
      ],
      {
        duration: 1350,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );

    anim.onfinish = () => smiley.remove();
  }

  // --- Swap Animation ---
  async function runSwapAnimation() {
    if (state.phase !== 'AWAITING_FIRST_ANSWER') return;
    const round = state.rounds[state.currentRoundIndex];
    if (!round || round.swapped) return;

    state.phase = 'ANIMATING_SWAP';
    renderStage();

    const leftRect = dom.leftCard.getBoundingClientRect();
    const rightRect = dom.rightCard.getBoundingClientRect();
    const dx = rightRect.left - leftRect.left;
    const arcHeight = Math.min(68, Math.max(38, Math.abs(dx) * 0.22));

    dom.leftCard.style.zIndex = '5';
    dom.rightCard.style.zIndex = '2';
    dom.plusSymbol.classList.add('operator-symbol--pulse');

    const leftKeyframes = [
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: `translate(${dx * 0.25}px, ${-arcHeight * 0.72}px) scale(1.05)` },
      { transform: `translate(${dx * 0.5}px, ${-arcHeight}px) scale(1.08)` },
      { transform: `translate(${dx * 0.75}px, ${-arcHeight * 0.72}px) scale(1.05)` },
      { transform: `translate(${dx}px, 0px) scale(1)` },
    ];

    const rightKeyframes = [
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: `translate(${-dx * 0.25}px, ${arcHeight * 0.72}px) scale(0.96)` },
      { transform: `translate(${-dx * 0.5}px, ${arcHeight}px) scale(0.94)` },
      { transform: `translate(${-dx * 0.75}px, ${arcHeight * 0.72}px) scale(0.96)` },
      { transform: `translate(${-dx}px, 0px) scale(1)` },
    ];

    const timing = {
      duration: SWAP_DURATION_MS,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    };

    const animLeft = dom.leftCard.animate(leftKeyframes, timing);
    const animRight = dom.rightCard.animate(rightKeyframes, timing);
    state.activeAnimations = [animLeft, animRight];

    try {
      await Promise.all([animLeft.finished, animRight.finished]);
    } catch {
      return;
    }

    if (state.phase !== 'ANIMATING_SWAP') return;

    round.swapped = true;
    state.phase = 'AWAITING_SECOND_ANSWER';

    // Clear canvas so child has a fresh drawing surface for Step 2
    clearCanvas();

    renderStage();
    animLeft.cancel();
    animRight.cancel();
    state.activeAnimations = [];
    dom.leftCard.style.zIndex = '';
    dom.rightCard.style.zIndex = '';
    dom.plusSymbol.classList.remove('operator-symbol--pulse');
  }

  // --- Grading & Round Advancement ---
  function gradeRound(isCorrect) {
    if (!isInputPhase()) return;
    const round = state.rounds[state.currentRoundIndex];
    if (!round) return;

    round.result = isCorrect ? 'tick' : 'cross';
    state.phase = 'ROUND_FEEDBACK';

    renderScoreboard();
    renderStage();

    if (isCorrect) {
      playCorrectSound();
      spawnConfetti(true);
    } else {
      playWrongSound();
      spawnSadSmiley();
    }

    clearTimeout(state.feedbackTimerId);
    const delayMs = isCorrect ? CORRECT_FEEDBACK_DURATION_MS : FEEDBACK_DURATION_MS;
    state.feedbackTimerId = setTimeout(() => {
      if (state.phase !== 'ROUND_FEEDBACK') return;
      if (state.currentRoundIndex + 1 < TOTAL_ROUNDS) {
        state.currentRoundIndex += 1;
        state.typedAnswer = '';
        state.phase = 'AWAITING_FIRST_ANSWER';
        clearCanvas();
        renderScoreboard();
        renderStage();
      } else {
        showSummary();
      }
    }, delayMs);
  }

  function showSummary() {
    state.phase = 'GAME_OVER';
    state.gameOverEnteredAt = performance.now();
    renderScoreboard();

    const ticks = state.rounds.filter((r) => r.result === 'tick').length;
    dom.summaryScoreNumber.textContent = `${ticks} / ${TOTAL_ROUNDS}`;

    if (ticks === TOTAL_ROUNDS) {
      dom.summaryTitle.textContent = 'Perfect 10 out of 10!';
      dom.summarySubtitle.textContent = 'You mastered x + y = y + x!';
    } else if (ticks >= 7) {
      dom.summaryTitle.textContent = 'Awesome Job!';
      dom.summarySubtitle.textContent = 'You really understand swapping numbers!';
    } else {
      dom.summaryTitle.textContent = 'Great Effort!';
      dom.summarySubtitle.textContent = 'Every round helps your addition grow stronger!';
    }

    dom.summaryList.innerHTML = '';
    state.rounds.forEach((round, idx) => {
      const li = document.createElement('li');
      const isTick = round.result === 'tick';
      li.className = `summary-item ${isTick ? 'summary-item--tick' : 'summary-item--cross'}`;
      li.innerHTML = `
        <span class="summary-item__round">#${idx + 1}</span>
        <span class="summary-item__eq">${round.x} + ${round.y} = ${round.y} + ${round.x} = ${round.sum}</span>
        <span aria-label="${isTick ? 'Correct' : 'Incorrect'}">${isTick ? '✓' : '✗'}</span>
      `;
      dom.summaryList.appendChild(li);
    });

    dom.summaryOverlay.classList.remove('is-hidden');
    playFanfareSound();
    spawnConfetti();
  }

  function startNewGame() {
    clearTimeout(state.feedbackTimerId);
    state.feedbackTimerId = null;

    state.activeAnimations.forEach((anim) => {
      try {
        anim.cancel();
      } catch {
        // Ignore
      }
    });
    state.activeAnimations = [];
    dom.leftCard.style.zIndex = '';
    dom.rightCard.style.zIndex = '';
    dom.plusSymbol.classList.remove('operator-symbol--pulse');
    dom.answerCard.classList.remove('answer-card--nudge');
    dom.confettiLayer.innerHTML = '';

    state.rounds = generateRounds(TOTAL_ROUNDS);
    state.currentRoundIndex = 0;
    state.typedAnswer = '';
    state.phase = 'AWAITING_FIRST_ANSWER';

    clearCanvas();
    dom.summaryOverlay.classList.add('is-hidden');
    renderScoreboard();
    renderStage();
  }

  // --- Input Submission Handlers ---
  function appendDigit(digit) {
    if (!isInputPhase()) return;
    if (state.typedAnswer.length >= 2) return;
    state.typedAnswer = state.typedAnswer === '0' ? digit : `${state.typedAnswer}${digit}`;
    dom.recognizedValue.textContent = state.typedAnswer;
    renderStage();
  }

  function handleBackspace() {
    if (!isInputPhase()) return;
    if (state.typedAnswer.length === 0) return;
    state.typedAnswer = state.typedAnswer.slice(0, -1);
    dom.recognizedValue.textContent = state.typedAnswer || '—';
    renderStage();
  }

  function handleSubmit() {
    if (state.phase === 'GAME_OVER') {
      if (performance.now() - state.gameOverEnteredAt >= GAME_OVER_INPUT_GUARD_MS) {
        startNewGame();
      }
      return;
    }

    if (!isInputPhase()) return;
    if (state.typedAnswer === '') {
      nudgeAnswerRequired();
      return;
    }

    const round = state.rounds[state.currentRoundIndex];
    if (!round) return;

    const entered = Number(state.typedAnswer);
    if (state.phase === 'AWAITING_FIRST_ANSWER') {
      round.firstAnswer = entered;
      state.typedAnswer = '';
      if (entered === round.sum) {
        runSwapAnimation();
      } else {
        gradeRound(false);
      }
    } else if (state.phase === 'AWAITING_SECOND_ANSWER') {
      round.secondAnswer = entered;
      state.typedAnswer = '';
      gradeRound(entered === round.sum);
    }
  }

  // --- Mode Switching (Handwriting vs Keypad) ---
  function setInputMode(mode) {
    state.inputMode = mode;
    const isWrite = mode === 'write';

    dom.modeWriteBtn.classList.toggle('mode-btn--active', isWrite);
    dom.modeWriteBtn.setAttribute('aria-selected', String(isWrite));

    dom.modePadBtn.classList.toggle('mode-btn--active', !isWrite);
    dom.modePadBtn.setAttribute('aria-selected', String(!isWrite));

    dom.drawPanel.classList.toggle('is-hidden', !isWrite);
    dom.numpad.classList.toggle('is-hidden', isWrite);

    if (isWrite) {
      setTimeout(() => resizeCanvas(), 50);
    }
  }

  // --- Keyboard Input (iPad Magic Keyboard & Desktop) ---
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      unlockAudio();
      appendDigit(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      unlockAudio();
      handleBackspace();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      unlockAudio();
      handleSubmit();
    } else if ((e.code === 'Space' || e.key === ' ') && state.phase === 'GAME_OVER') {
      e.preventDefault();
      unlockAudio();
      handleSubmit();
    }
  });

  // --- Button Listeners ---
  function bindCleanClick(btn, handler) {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      unlockAudio();
      handler();
    });
  }

  function bindInstantTap(btn, handler) {
    if (!btn) return;

    btn.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (btn.disabled) return;
      btn.classList.add('is-active');
      unlockAudio();
      handler();
    });

    const removeActive = () => btn.classList.remove('is-active');
    btn.addEventListener('pointerup', removeActive);
    btn.addEventListener('pointercancel', removeActive);
    btn.addEventListener('pointerleave', removeActive);

    btn.addEventListener('click', (e) => {
      if (e.detail === 0 && !btn.disabled) {
        btn.blur();
        unlockAudio();
        handler();
      }
    });
  }

  // Bind Buttons
  dom.digitButtons.forEach((btn) => {
    bindInstantTap(btn, () => appendDigit(btn.dataset.digit));
  });
  bindInstantTap(dom.backspaceBtn, () => handleBackspace());
  bindInstantTap(dom.submitBtn, () => handleSubmit());
  bindInstantTap(dom.canvasSubmitBtn, () => handleSubmit());

  bindCleanClick(dom.clearCanvasBtn, () => clearCanvas());
  bindCleanClick(dom.modeWriteBtn, () => setInputMode('write'));
  bindCleanClick(dom.modePadBtn, () => setInputMode('keypad'));

  bindCleanClick(dom.soundBtn, () => toggleSound());
  bindCleanClick(dom.restartBtn, () => startNewGame());
  bindCleanClick(dom.playAgainBtn, () => startNewGame());

  // Initialize
  initCanvas();
  updateSoundUI();
  setInputMode('write');
  startNewGame();
})();
