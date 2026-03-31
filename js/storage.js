(function initStorage(global) {
  const FocusFlow = global.FocusFlow || (global.FocusFlow = {});
  const { STORAGE_KEY } = FocusFlow;

  function normalizeSession(session) {
    return {
      id: session.id || String(Date.now()),
      startTime: session.startTime || new Date().toISOString(),
      endTime: session.endTime || null,
      duration: Number(session.duration || 0),
      focusScore: Number(session.focusScore || 0),
      tabSwitches: Number(session.tabSwitches || 0),
      inactivityEvents: Number(session.inactivityEvents || 0),
      noFaceSeconds: Number(session.noFaceSeconds || 0),
      presentSeconds: Number(session.presentSeconds || 0),
      cameraEnabled: Boolean(session.cameraEnabled),
      scoreBreakdown: session.scoreBreakdown || null,
      completed: Boolean(session.completed),
    };
  }

  function loadSessions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeSession);
    } catch {
      return [];
    }
  }

  function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.map(normalizeSession)));
  }

  FocusFlow.normalizeSession = normalizeSession;
  FocusFlow.loadSessions = loadSessions;
  FocusFlow.saveSessions = saveSessions;
})(window);
