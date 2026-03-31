(function initAppModule(global) {
  const FocusFlow = global.FocusFlow || (global.FocusFlow = {});
  const {
    MOTIVATIONAL_QUOTES,
    TIMER_PRESETS,
    SCORE_RULES,
    INACTIVITY_THRESHOLD,
    DARK_MODE_KEY,
    CAMERA_PREF_KEY,
    CameraTracker,
    createEmptyMetrics,
    computeScoreDetails,
    formatDuration,
    formatTime,
    getEmojiStateByProgress,
    getEmojiByFocusScore,
    loadSessions,
    saveSessions,
  } = FocusFlow;

  const state = {
    route: 'entry',
    currentPreset: 'pomodoro',
    customWorkDuration: null,
    totalTime: TIMER_PRESETS.pomodoro.work,
    timeRemaining: TIMER_PRESETS.pomodoro.work,
    isRunning: false,
    isPaused: false,
    isBreak: false,
    isCompleted: false,
    focusScore: SCORE_RULES.base,
    sessionStart: null,
    lastActivity: Date.now(),
    lastFaceSeenAt: 0,
    lastCameraSampleAt: 0,
    noFaceContinuousSeconds: 0,
    lastCameraRecoverAt: 0,
    lastSessionSummary: '',
    timerInterval: null,
    inactivityInterval: null,
    cameraNoFaceStreak: 0,
    camera: new CameraTracker(),
    sessionMetrics: createEmptyMetrics(),
    scoreDetails: computeScoreDetails(createEmptyMetrics()),
  };

  const els = {
    entryView: document.getElementById('entryView'),
    dashboardView: document.getElementById('dashboardView'),
    timerView: document.getElementById('timerView'),
    statsView: document.getElementById('statsView'),
    entryCard: document.getElementById('entryCard'),
    quoteText: document.getElementById('quoteText'),
    quoteAuthor: document.getElementById('quoteAuthor'),
    startBtn: document.getElementById('startBtn'),
    homeBtn: document.getElementById('homeBtn'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    darkModeIcon: document.getElementById('darkModeIcon'),
    timerTab: document.getElementById('timerTab'),
    statsTab: document.getElementById('statsTab'),
    sessionsToday: document.getElementById('sessionsToday'),
    timerEmoji: document.getElementById('timerEmoji'),
    timerText: document.getElementById('timerText'),
    timerStatus: document.getElementById('timerStatus'),
    timerGlowWrap: document.getElementById('timerGlowWrap'),
    primaryTimerBtn: document.getElementById('primaryTimerBtn'),
    primaryTimerBtnIcon: document.getElementById('primaryTimerBtnIcon'),
    primaryTimerBtnText: document.getElementById('primaryTimerBtnText'),
    progressLabel: document.getElementById('progressLabel'),
    progressBar: document.getElementById('progressBar'),
    motivationalMessage: document.getElementById('motivationalMessage'),
    focusEmoji: document.getElementById('focusEmoji'),
    focusScore: document.getElementById('focusScore'),
    tabSwitchChip: document.getElementById('tabSwitchChip'),
    noFaceChip: document.getElementById('noFaceChip'),
    timerEditor: document.getElementById('timerEditor'),
    minutesInput: document.getElementById('minutesInput'),
    secondsInput: document.getElementById('secondsInput'),
    applyTimeBtn: document.getElementById('applyTimeBtn'),
    cameraToggleBtn: document.getElementById('cameraToggleBtn'),
    cameraStatusText: document.getElementById('cameraStatusText'),
    detectionEngineText: document.getElementById('detectionEngineText'),
    presetSelector: document.getElementById('presetSelector'),
    timerControls: document.getElementById('timerControls'),
    statusHint: document.getElementById('statusHint'),
    statsGrid: document.getElementById('statsGrid'),
    sessionSummaryCard: document.getElementById('sessionSummaryCard'),
    sessionSummaryText: document.getElementById('sessionSummaryText'),
    emptyState: document.getElementById('emptyState'),
    scoreInfoBtn: document.getElementById('scoreInfoBtn'),
    scoreModal: document.getElementById('scoreModal'),
    closeScoreModalBtn: document.getElementById('closeScoreModalBtn'),
    scoreFormulaText: document.getElementById('scoreFormulaText'),
    toastContainer: document.getElementById('toastContainer'),
  };

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function setDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(DARK_MODE_KEY, String(isDark));
    els.darkModeIcon.textContent = isDark ? '☀️' : '🌙';
  }

  function initDarkMode() {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    const isDark = stored === null
      ? global.matchMedia('(prefers-color-scheme: dark)').matches
      : stored === 'true';
    setDarkMode(isDark);
  }

  function resetSessionMetrics() {
    state.sessionMetrics = createEmptyMetrics();
    state.cameraNoFaceStreak = 0;
    state.lastFaceSeenAt = 0;
    state.lastCameraSampleAt = 0;
    state.noFaceContinuousSeconds = 0;
    state.lastCameraRecoverAt = 0;
  }

  function recalculateFocusScore() {
    state.scoreDetails = computeScoreDetails(state.sessionMetrics);
    state.focusScore = state.scoreDetails.finalScore;
  }

  function getWorkDuration() {
    return state.customWorkDuration ?? TIMER_PRESETS[state.currentPreset].work;
  }

  function updateRoute(route) {
    state.route = route;
    const showEntry = route === 'entry';
    const showStats = route === 'stats';

    els.entryView.classList.toggle('hidden', !showEntry);
    els.dashboardView.classList.toggle('hidden', showEntry);
    els.timerView.classList.toggle('hidden', showStats || showEntry);
    els.statsView.classList.toggle('hidden', !showStats);
    els.timerTab.classList.toggle('active', !showStats && !showEntry);
    els.statsTab.classList.toggle('active', showStats);

    if (showStats) renderStats();
  }

  function updateActivity() {
    state.lastActivity = Date.now();
  }

  function stopTimerLoops() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    if (state.inactivityInterval) {
      clearInterval(state.inactivityInterval);
      state.inactivityInterval = null;
    }
  }

  function updateCameraUI() {
    if (!state.camera.supported) {
      els.cameraToggleBtn.disabled = true;
      els.cameraToggleBtn.textContent = 'Camera Unsupported';
      els.cameraStatusText.textContent = 'This browser does not support camera access.';
      els.detectionEngineText.textContent = 'Detection engine: Not available';
      return;
    }

    els.cameraToggleBtn.disabled = false;
    els.cameraToggleBtn.textContent = state.camera.enabled ? 'Disable Camera' : 'Enable Camera';

    if (state.camera.permissionBlocked) {
      els.cameraStatusText.textContent = 'Camera access blocked. Allow permission in browser settings.';
    } else if (!state.camera.enabled) {
      els.cameraStatusText.textContent = 'Camera is off. Enable it to track study presence.';
    } else if (state.isRunning && !state.isPaused && !state.isBreak) {
      els.cameraStatusText.textContent = 'Camera on: tracking if you are in front of screen.';
    } else {
      els.cameraStatusText.textContent = 'Camera ready. Start session to track study presence.';
    }

    els.detectionEngineText.textContent = `Detection engine: ${state.camera.detectionEngine || 'Not active'}`;
  }

  async function ensureCameraForSession() {
    if (!state.camera.enabled) return;

    await state.camera.startMonitoring({
      shouldRun: () => state.isRunning && !state.isPaused && !state.isBreak,
      onResult: ({ hasFace }) => {
        const now = Date.now();
        let deltaSeconds = state.lastCameraSampleAt > 0 ? (now - state.lastCameraSampleAt) / 1000 : 1;
        deltaSeconds = Math.max(0.6, Math.min(2.5, deltaSeconds));
        state.lastCameraSampleAt = now;

        if (hasFace === null) {
          renderTimer();
          return;
        }

        if (hasFace) {
          state.sessionMetrics.presentSeconds += deltaSeconds;
          state.cameraNoFaceStreak = 0;
          state.noFaceContinuousSeconds = 0;
          state.lastFaceSeenAt = now;
        } else {
          state.cameraNoFaceStreak += 1;
          state.noFaceContinuousSeconds += deltaSeconds;

          if (state.noFaceContinuousSeconds >= 20 && now - state.lastCameraRecoverAt > 20000) {
            state.lastCameraRecoverAt = now;
            state.noFaceContinuousSeconds = 0;
            state.camera.stopStream();
            state.camera.enabled = true;
            ensureCameraForSession();
            showToast('Reacquiring camera detection...');
            return;
          }

          if (state.noFaceContinuousSeconds >= 10) {
            state.sessionMetrics.noFaceSeconds += deltaSeconds;
          }
        }
        recalculateFocusScore();
        renderTimer();
      },
      onError: () => {
        state.camera.enabled = false;
        localStorage.setItem(CAMERA_PREF_KEY, 'false');
        updateCameraUI();
        showToast('Camera detection unavailable in this session.');
      },
    });

    updateCameraUI();
  }

  async function enableCamera() {
    if (!state.camera.supported) {
      updateCameraUI();
      return;
    }

    const ok = await state.camera.enable();
    if (!ok) {
      localStorage.setItem(CAMERA_PREF_KEY, 'false');
      updateCameraUI();
      showToast('Unable to enable camera detection.');
      return;
    }

    localStorage.setItem(CAMERA_PREF_KEY, 'true');
    updateCameraUI();

    if (state.isRunning && !state.isPaused && !state.isBreak) {
      await ensureCameraForSession();
    }

    showToast('Camera enabled');
  }

  function disableCamera() {
    state.camera.disable();
    localStorage.setItem(CAMERA_PREF_KEY, 'false');
    updateCameraUI();
    showToast('Camera disabled');
  }

  async function toggleCamera() {
    if (state.camera.enabled) disableCamera();
    else await enableCamera();
  }

  function applyTabSwitchPenalty() {
    state.sessionMetrics.tabSwitches += 1;
    recalculateFocusScore();
    renderTimer();
  }

  function applyInactivityPenalty() {
    state.sessionMetrics.inactivityEvents += 1;
    recalculateFocusScore();
    renderTimer();
  }

  function startTimerLoop() {
    if (!state.isRunning || state.isPaused) return;

    stopTimerLoops();

    state.timerInterval = setInterval(() => {
      if (state.timeRemaining <= 1) {
        state.timeRemaining = 0;
        stopTimerLoops();
        onTimerComplete();
        renderTimer();
        return;
      }

      state.timeRemaining -= 1;
      renderTimer();
    }, 1000);

    state.inactivityInterval = setInterval(() => {
      if (Date.now() - state.lastActivity > INACTIVITY_THRESHOLD && state.isRunning && !state.isPaused && !state.isBreak) {
        if (state.camera.enabled && state.lastFaceSeenAt > 0 && Date.now() - state.lastFaceSeenAt < 8000) {
          return;
        }
        applyInactivityPenalty();
        state.lastActivity = Date.now();
        showToast(`Inactivity detected: -${SCORE_RULES.inactivityPenalty} points`);
      }
    }, 5000);
  }

  function onTimerComplete() {
    state.camera.stopMonitoring();

    if (state.isBreak) {
      state.isBreak = false;
      state.totalTime = getWorkDuration();
      state.timeRemaining = state.totalTime;
      state.isRunning = false;
      state.isCompleted = false;
      showToast("Break's over. Ready for next session.");
      updateCameraUI();
      return;
    }

    state.isCompleted = true;
    state.isRunning = false;
    recalculateFocusScore();

    const session = {
      id: String(Date.now()),
      startTime: state.sessionStart || new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: state.totalTime,
      focusScore: state.focusScore,
      tabSwitches: state.sessionMetrics.tabSwitches,
      inactivityEvents: state.sessionMetrics.inactivityEvents,
      noFaceSeconds: state.sessionMetrics.noFaceSeconds,
      presentSeconds: state.sessionMetrics.presentSeconds,
      cameraEnabled: state.camera.enabled,
      scoreBreakdown: state.scoreDetails,
      completed: true,
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    state.lastSessionSummary = `Score ${state.focusScore}/100 • ${formatDuration(session.duration)} focused • Tab switches ${session.tabSwitches} • Not in front ${formatDuration(session.noFaceSeconds)}`;
    showToast(`Session done: ${state.lastSessionSummary}`);
    updateCameraUI();
  }

  async function startSession() {
    state.isRunning = true;
    state.isPaused = false;
    state.isCompleted = false;
    state.isBreak = false;
    state.sessionStart = new Date().toISOString();
    state.lastActivity = Date.now();

    resetSessionMetrics();
    recalculateFocusScore();

    startTimerLoop();
    await ensureCameraForSession();
    renderTimer();
  }

  function pauseSession() {
    state.isPaused = true;
    stopTimerLoops();
    state.camera.stopMonitoring();
    updateCameraUI();
    renderTimer();
  }

  async function resumeSession() {
    state.isPaused = false;
    state.lastActivity = Date.now();
    startTimerLoop();
    await ensureCameraForSession();
    updateCameraUI();
    renderTimer();
  }

  function resetSession() {
    state.isRunning = false;
    state.isPaused = false;
    state.isBreak = false;
    state.isCompleted = false;
    state.totalTime = getWorkDuration();
    state.timeRemaining = state.totalTime;

    resetSessionMetrics();
    recalculateFocusScore();

    stopTimerLoops();
    state.camera.stopMonitoring();
    updateCameraUI();
    renderTimer();
  }

  function skipToBreak() {
    state.isBreak = true;
    state.isCompleted = false;
    const preset = TIMER_PRESETS[state.currentPreset];
    const sessions = loadSessions().filter((s) => s.completed);
    const breakTime = sessions.length > 0 && sessions.length % 4 === 0
      ? preset.longBreak
      : preset.break;

    state.totalTime = breakTime;
    state.timeRemaining = breakTime;
    state.isRunning = true;
    state.isPaused = false;
    state.lastActivity = Date.now();

    startTimerLoop();
    state.camera.stopMonitoring();
    updateCameraUI();
    renderTimer();
  }

  function setPreset(preset) {
    if (state.isRunning || state.isCompleted) return;

    state.currentPreset = preset;
    state.customWorkDuration = null;
    state.totalTime = TIMER_PRESETS[preset].work;
    state.timeRemaining = state.totalTime;
    state.isPaused = false;
    state.isBreak = false;
    state.isCompleted = false;
    renderTimer();
  }

  function applyCustomTime() {
    if (state.isRunning || state.isCompleted || state.isBreak) return;

    const mins = Number.parseInt(els.minutesInput.value, 10);
    const secs = Number.parseInt(els.secondsInput.value, 10);
    const safeMins = Number.isFinite(mins) ? Math.max(0, Math.min(999, mins)) : 0;
    const safeSecs = Number.isFinite(secs) ? Math.max(0, Math.min(59, secs)) : 0;
    const customSeconds = safeMins * 60 + safeSecs;

    if (customSeconds <= 0) {
      showToast('Set a time greater than 00:00');
      return;
    }

    state.customWorkDuration = customSeconds;
    state.totalTime = customSeconds;
    state.timeRemaining = customSeconds;
    state.isPaused = false;
    state.isBreak = false;
    state.isCompleted = false;
    renderTimer();
  }

  function getProgressColorClass() {
    if (state.isBreak) return 'progress-accent';
    if (state.isCompleted) return 'progress-success';
    if (state.focusScore >= 80) return 'progress-success';
    if (state.focusScore >= 55) return 'progress-warning';
    return 'progress-danger';
  }

  function renderPresetSelector() {
    if (!(!state.isRunning && !state.isCompleted)) {
      els.presetSelector.innerHTML = '';
      return;
    }

    els.presetSelector.innerHTML = Object.keys(TIMER_PRESETS)
      .map((key) => {
        const preset = TIMER_PRESETS[key];
        const active = key === state.currentPreset && state.customWorkDuration === null;
        return `<button class="btn btn-main ${active ? 'btn-hero' : 'btn-glass'}" type="button" data-preset="${key}">🕒 ${preset.label}</button>`;
      })
      .join('');

    Array.from(els.presetSelector.querySelectorAll('[data-preset]')).forEach((btn) => {
      btn.addEventListener('click', () => setPreset(btn.dataset.preset));
    });
  }

  function renderControls() {
    const controls = [];
    if (state.isRunning || state.isCompleted) {
      controls.push('<button class="btn btn-main btn-icon btn-glass" type="button" data-action="reset">↺</button>');
    }

    els.timerControls.innerHTML = controls.join('');
    Array.from(els.timerControls.querySelectorAll('[data-action]')).forEach((btn) => {
      if (btn.dataset.action === 'reset') btn.addEventListener('click', resetSession);
    });

    if (state.isRunning) {
      els.statusHint.textContent = state.isPaused
        ? 'Session paused.'
        : state.isBreak
          ? 'Break running.'
          : 'Focus session running.';
    } else {
      els.statusHint.textContent = '';
    }
  }

  function handlePrimaryTimerAction() {
    if (!state.isRunning && !state.isCompleted) {
      startSession();
      return;
    }
    if (state.isRunning && !state.isPaused) {
      pauseSession();
      return;
    }
    if (state.isRunning && state.isPaused) {
      resumeSession();
      return;
    }
    if (state.isCompleted && !state.isBreak) {
      skipToBreak();
    }
  }

  function renderPrimaryTimerButton() {
    if (!state.isRunning && !state.isCompleted) {
      els.primaryTimerBtn.classList.remove('no-icon');
      els.primaryTimerBtnIcon.style.display = '';
      els.primaryTimerBtnIcon.textContent = '▶';
      els.primaryTimerBtnText.textContent = 'Start Session';
      return;
    }
    if (state.isRunning && !state.isPaused) {
      els.primaryTimerBtn.classList.add('no-icon');
      els.primaryTimerBtnIcon.style.display = 'none';
      els.primaryTimerBtnText.textContent = 'Pause';
      return;
    }
    if (state.isRunning && state.isPaused) {
      els.primaryTimerBtn.classList.add('no-icon');
      els.primaryTimerBtnIcon.style.display = 'none';
      els.primaryTimerBtnText.textContent = 'Resume';
      return;
    }
    if (state.isCompleted && !state.isBreak) {
      els.primaryTimerBtn.classList.remove('no-icon');
      els.primaryTimerBtnIcon.style.display = '';
      els.primaryTimerBtnIcon.textContent = '☕';
      els.primaryTimerBtnText.textContent = 'Start Break';
      return;
    }
    els.primaryTimerBtn.classList.remove('no-icon');
    els.primaryTimerBtnIcon.style.display = '';
    els.primaryTimerBtnIcon.textContent = '▶';
    els.primaryTimerBtnText.textContent = 'Start Session';
  }

  function renderTimer() {
    const progress = state.totalTime > 0 ? state.timeRemaining / state.totalTime : 1;
    const progressPercent = Math.round((1 - progress) * 100);
    const emojiState = getEmojiStateByProgress(progress, state.isBreak, state.isCompleted);

    const sessions = loadSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = sessions.filter((s) => new Date(s.startTime) >= today).length;

    els.sessionsToday.textContent = String(todayCount);
    els.timerEmoji.textContent = emojiState.emoji;
    els.timerText.textContent = formatTime(state.timeRemaining);
    els.timerStatus.textContent = state.isBreak
      ? 'Break Time'
      : state.isCompleted
        ? 'Completed'
        : state.isPaused
          ? 'Paused'
          : state.isRunning
            ? 'Focusing'
            : 'Ready';

    els.progressLabel.textContent = `${progressPercent}%`;
    els.progressBar.style.width = `${progressPercent}%`;
    els.progressBar.className = `progress-indicator ${getProgressColorClass()}`;
    els.motivationalMessage.textContent = emojiState.message;
    els.focusEmoji.textContent = getEmojiByFocusScore(state.focusScore);
    els.focusScore.textContent = String(state.focusScore);

    els.tabSwitchChip.textContent = String(state.sessionMetrics.tabSwitches);
    els.noFaceChip.textContent = formatDuration(state.sessionMetrics.noFaceSeconds);

    els.timerGlowWrap.classList.toggle('timer-glow', state.isRunning && !state.isPaused);

    const editorDisabled = state.isRunning || state.isCompleted || state.isBreak;
    els.minutesInput.disabled = editorDisabled;
    els.secondsInput.disabled = editorDisabled;
    els.applyTimeBtn.disabled = editorDisabled;
    els.timerEditor.classList.toggle('hidden', state.isBreak);

    if (!editorDisabled) {
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = state.timeRemaining % 60;
      els.minutesInput.value = String(minutes);
      els.secondsInput.value = String(seconds).padStart(2, '0');
    }

    renderPrimaryTimerButton();
    renderPresetSelector();
    renderControls();
    updateCameraUI();
  }

  function renderScoreFormula(session) {
    const metrics = session
      ? {
        tabSwitches: session.tabSwitches || 0,
        inactivityEvents: session.inactivityEvents || 0,
        noFaceSeconds: session.noFaceSeconds || 0,
        presentSeconds: session.presentSeconds || 0,
      }
      : state.sessionMetrics;

    const details = session?.scoreBreakdown || computeScoreDetails(metrics);

    els.scoreFormulaText.innerHTML = `
      <p>Final focus score starts at <strong>${SCORE_RULES.base}</strong> and subtracts penalties:</p>
      <ul>
        <li>Tab switches: ${metrics.tabSwitches} x ${SCORE_RULES.tabSwitchPenalty} = <strong>-${details.tabPenalty.toFixed(1)}</strong></li>
        <li>Inactivity events: ${metrics.inactivityEvents} x ${SCORE_RULES.inactivityPenalty} = <strong>-${details.inactivityPenalty.toFixed(1)}</strong></li>
        <li>No face detected (after grace): ${details.effectiveNoFaceSeconds || 0}s x ${SCORE_RULES.noFacePenaltyPerSecond} = <strong>-${details.noFacePenalty.toFixed(1)}</strong></li>
      </ul>
      <p>Total penalty: <strong>-${details.totalPenalty.toFixed(1)}</strong></p>
      <p>Final score: <strong>${details.finalScore}</strong> / 100</p>
    `;
  }

  function renderStats() {
    const sessions = loadSessions().filter((s) => s.completed);

    if (!sessions.length) {
      els.statsGrid.innerHTML = '';
      els.emptyState.classList.remove('hidden');
      els.sessionSummaryCard.classList.add('hidden');
      renderScoreFormula(null);
      return;
    }

    els.emptyState.classList.add('hidden');

    const totalTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const avgFocusScore = Math.round(sessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / sessions.length);
    const totalTabSwitches = sessions.reduce((acc, s) => acc + (s.tabSwitches || 0), 0);
    const totalInactivity = sessions.reduce((acc, s) => acc + (s.inactivityEvents || 0), 0);
    const totalNoFace = sessions.reduce((acc, s) => acc + (s.noFaceSeconds || 0), 0);
    const focusBreaks = totalTabSwitches + totalInactivity;

    const cards = [
      { icon: '⏰', label: 'Total Study Time', value: formatDuration(totalTime) },
      { icon: '📚', label: 'Sessions Completed', value: sessions.length },
      { icon: '🎯', label: 'Average Focus Score', value: `${avgFocusScore}` },
      { icon: '⚠️', label: 'Focus Breaks', value: `${focusBreaks}` },
      { icon: '📷', label: 'Not In Front Time', value: formatDuration(totalNoFace) },
    ];

    els.statsGrid.innerHTML = cards
      .map((card) => `
        <article class="glass-card stat-card">
          <div class="stat-head">
            <div class="stat-icon">${card.icon}</div>
            <div>
              <div class="stat-label">${card.label}</div>
              <div class="stat-value">${card.value}</div>
            </div>
          </div>
        </article>
      `)
      .join('');

    const last = sessions[sessions.length - 1];
    const summary = state.lastSessionSummary || `Score ${last.focusScore}/100 • ${formatDuration(last.duration)} focused • Tab switches ${last.tabSwitches || 0} • Not in front ${formatDuration(last.noFaceSeconds || 0)}`;
    els.sessionSummaryText.textContent = summary;
    els.sessionSummaryCard.classList.remove('hidden');

    renderScoreFormula(last);
  }

  function openScoreModal() {
    renderStats();
    els.scoreModal.classList.remove('hidden');
  }

  function closeScoreModal() {
    els.scoreModal.classList.add('hidden');
  }

  function initQuote() {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    els.quoteText.textContent = `"${quote.text}"`;
    els.quoteAuthor.textContent = `- ${quote.author}`;
    requestAnimationFrame(() => {
      setTimeout(() => els.entryCard.classList.add('visible'), 100);
    });
  }

  function attachGlobalEvents() {
    els.startBtn.addEventListener('click', () => updateRoute('timer'));
    els.homeBtn.addEventListener('click', () => {
      closeScoreModal();
      updateRoute('entry');
    });
    els.timerTab.addEventListener('click', () => updateRoute('timer'));
    els.statsTab.addEventListener('click', () => updateRoute('stats'));
    els.primaryTimerBtn.addEventListener('click', handlePrimaryTimerAction);

    els.applyTimeBtn.addEventListener('click', applyCustomTime);
    [els.minutesInput, els.secondsInput].forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') applyCustomTime();
      });
    });

    els.cameraToggleBtn.addEventListener('click', toggleCamera);
    els.scoreInfoBtn.addEventListener('click', openScoreModal);
    els.closeScoreModalBtn.addEventListener('click', closeScoreModal);
    els.scoreModal.addEventListener('click', (event) => {
      if (event.target === els.scoreModal) closeScoreModal();
    });

    els.darkModeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(!isDark);
    });

    ['mousemove', 'keydown', 'click', 'scroll'].forEach((eventName) => {
      global.addEventListener(eventName, updateActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.isRunning && !state.isPaused && !state.isBreak) {
        applyTabSwitchPenalty();
        showToast(`Tab switch detected: -${SCORE_RULES.tabSwitchPenalty} points`);
      }
    });
  }

  function initCameraPreference() {
    const pref = localStorage.getItem(CAMERA_PREF_KEY);
    if (pref === 'true') {
      state.camera.enabled = true;
      state.camera.ensureReady().then(updateCameraUI);
    }
    updateCameraUI();
  }

  function initApp() {
    initDarkMode();
    initQuote();
    initCameraPreference();
    resetSessionMetrics();
    recalculateFocusScore();
    attachGlobalEvents();
    renderTimer();
    updateRoute('entry');
  }

  global.addEventListener('beforeunload', () => {
    stopTimerLoops();
    state.camera.stopStream();
  });

  global.addEventListener('DOMContentLoaded', initApp);
})(window);
