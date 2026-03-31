(function initScoring(global) {
  const FocusFlow = global.FocusFlow || (global.FocusFlow = {});
  const { NO_FACE_GRACE_SECONDS, SCORE_RULES } = FocusFlow;

  function createEmptyMetrics() {
    return {
      tabSwitches: 0,
      inactivityEvents: 0,
      noFaceSeconds: 0,
      presentSeconds: 0,
    };
  }

  function applyNoFaceGrace(rawNoFaceSeconds) {
    return Math.max(0, rawNoFaceSeconds - NO_FACE_GRACE_SECONDS);
  }

  function computeScoreDetails(metrics) {
    const tabPenalty = metrics.tabSwitches * SCORE_RULES.tabSwitchPenalty;
    const inactivityPenalty = metrics.inactivityEvents * SCORE_RULES.inactivityPenalty;
    const effectiveNoFaceSeconds = applyNoFaceGrace(metrics.noFaceSeconds || 0);
    const noFacePenalty = Number((effectiveNoFaceSeconds * SCORE_RULES.noFacePenaltyPerSecond).toFixed(1));
    const totalPenalty = Number((tabPenalty + inactivityPenalty + noFacePenalty).toFixed(1));
    const finalScore = Math.max(0, Math.min(100, Math.round(SCORE_RULES.base - totalPenalty)));

    return {
      tabPenalty,
      inactivityPenalty,
      noFacePenalty,
      totalPenalty,
      finalScore,
      effectiveNoFaceSeconds,
    };
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) return `${hours}h ${remMins}m`;
    return `${mins}m`;
  }

  function formatTime(seconds) {
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getEmojiStateByProgress(progress, isBreak, isCompleted) {
    if (isCompleted) return { emoji: '🥳', message: 'Session completed. Nice consistency.' };
    if (isBreak) return { emoji: '😌', message: 'Break mode active. Recover and reset.' };
    if (progress >= 0.75) return { emoji: '📖', message: 'Strong start. Keep the same pace.' };
    if (progress >= 0.5) return { emoji: '📘', message: 'Good middle stretch. Protect your focus.' };
    if (progress >= 0.3) return { emoji: '🧠', message: 'Locked in. Stay on this track.' };
    if (progress >= 0.1) return { emoji: '✨', message: 'Last push. Keep attention steady.' };
    return { emoji: '🎯', message: 'Finish line. End with quality focus.' };
  }

  function getEmojiByFocusScore(score) {
    if (score >= 85) return '😄';
    if (score >= 70) return '🙂';
    if (score >= 50) return '😐';
    if (score >= 30) return '😟';
    return '😣';
  }

  FocusFlow.createEmptyMetrics = createEmptyMetrics;
  FocusFlow.applyNoFaceGrace = applyNoFaceGrace;
  FocusFlow.computeScoreDetails = computeScoreDetails;
  FocusFlow.formatDuration = formatDuration;
  FocusFlow.formatTime = formatTime;
  FocusFlow.getEmojiStateByProgress = getEmojiStateByProgress;
  FocusFlow.getEmojiByFocusScore = getEmojiByFocusScore;
})(window);
