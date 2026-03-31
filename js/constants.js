(function initConstants(global) {
  const FocusFlow = global.FocusFlow || (global.FocusFlow = {});

  FocusFlow.MOTIVATIONAL_QUOTES = [
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: "It always seems impossible until it's done.", author: 'Nelson Mandela' },
    { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
    { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
    { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
    { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
    { text: "Your limitation-it's only your imagination.", author: 'Unknown' },
    { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
    { text: 'Great things never come from comfort zones.', author: 'Unknown' },
    { text: 'Dream it. Wish it. Do it.', author: 'Unknown' },
    { text: 'Stay focused, go after your dreams and keep moving toward your goals.', author: 'LL Cool J' },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: 'Unknown' },
    { text: "Don't stop when you're tired. Stop when you're done.", author: 'Unknown' },
  ];

  FocusFlow.TIMER_PRESETS = {
    pomodoro: { work: 25 * 60, break: 5 * 60, longBreak: 15 * 60, label: '25 min' },
    short: { work: 15 * 60, break: 3 * 60, longBreak: 10 * 60, label: '15 min' },
    long: { work: 50 * 60, break: 10 * 60, longBreak: 30 * 60, label: '50 min' },
  };

  FocusFlow.SCORE_RULES = {
    base: 100,
    tabSwitchPenalty: 8,
    inactivityPenalty: 5,
    noFacePenaltyPerSecond: 0.25,
  };

  FocusFlow.INACTIVITY_THRESHOLD = 30000;
  FocusFlow.NO_FACE_GRACE_SECONDS = 3;

  FocusFlow.STORAGE_KEY = 'study_buddy_sessions';
  FocusFlow.DARK_MODE_KEY = 'study_buddy_dark_mode';
  FocusFlow.CAMERA_PREF_KEY = 'study_buddy_camera_enabled';
})(window);
