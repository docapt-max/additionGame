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
    phase: 'AWAITING_FIRST_ANSWER', // AWAITING_FIRST_ANSWER | ANIMATING_SWAP | AWAITING_SECOND_ANSWER | ROUND_FEEDBACK | GAME_OVER
    typedAnswer: '',
    feedbackTimerId: null,
    gameOverEnteredAt: 0,
    activeAnimations: [],
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
      // LocalStorage may fail in private mode
    }
    updateSoundUI();
    if (soundEnabled) {
      unlockAudio();
      playTone(659.25, 0.0, 0.12, 'sine', 0.12);
    }
  }

  // --- Audio Synthesis (Web Audio API, zero external files) ---
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
        // Silently ignore
      }
    }
  }

  // Global unlock listeners for iOS Safari on first user touch anywhere
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
    playTone(523.25, 0.0, 0.16, 'sine', 0.14); // C5
    playTone(659.25, 0.09, 0.18, 'sine', 0.14); // E5
    playTone(783.99, 0.18, 0.28, 'sine', 0.16); // G5
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

    // Fisher-Yates shuffle
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
        result: null, // 'tick' | 'cross' | null
      };
    });
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

    // Number Pad & Feedback
    const canType = isInputPhase();
    dom.numpad.classList.toggle('numpad--locked', !canType);
    dom.digitButtons.forEach((btn) => { btn.disabled = !canType; });
    dom.backspaceBtn.disabled = !canType;
    dom.submitBtn.disabled = !canType;

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
    // Force reflow so animation replays cleanly
    void dom.answerCard.offsetWidth;
    dom.answerCard.classList.add('answer-card--nudge');
  }

  // --- Celebration Confetti ---
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
      // Cancelled by New Game reset
      return;
    }

    // If game was reset mid-flight, stop cleanly
    if (state.phase !== 'ANIMATING_SWAP') return;

    round.swapped = true;
    state.phase = 'AWAITING_SECOND_ANSWER';

    // Swap DOM contents and cancel transforms in the same frame so there is zero flicker
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
        // Ignore already finished animations
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

    dom.summaryOverlay.classList.add('is-hidden');
    renderScoreboard();
    renderStage();
  }

  // --- Number Pad & Unified Input Handlers ---
  function appendDigit(digit) {
    if (!isInputPhase()) return;
    if (state.typedAnswer.length >= 2) return;
    state.typedAnswer = state.typedAnswer === '0' ? digit : `${state.typedAnswer}${digit}`;
    renderStage();
  }

  function handleBackspace() {
    if (!isInputPhase()) return;
    if (state.typedAnswer.length === 0) return;
    state.typedAnswer = state.typedAnswer.slice(0, -1);
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

  // --- Keyboard Input (iPad Smart/Magic Keyboard & Desktop) ---
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

  // --- Pointer / Touch / Button Controls for iPad & Web ---
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

    // Support keyboard activation (Enter/Space when focused)
    btn.addEventListener('click', (e) => {
      if (e.detail === 0 && !btn.disabled) {
        btn.blur();
        unlockAudio();
        handler();
      }
    });
  }

  // Bind Numpad Buttons
  dom.digitButtons.forEach((btn) => {
    bindInstantTap(btn, () => appendDigit(btn.dataset.digit));
  });
  bindInstantTap(dom.backspaceBtn, () => handleBackspace());
  bindInstantTap(dom.submitBtn, () => handleSubmit());

  // Bind Top Bar Actions
  bindCleanClick(dom.soundBtn, () => toggleSound());
  bindCleanClick(dom.restartBtn, () => startNewGame());
  bindCleanClick(dom.playAgainBtn, () => startNewGame());

  // Initialize
  updateSoundUI();
  startNewGame();
})();
