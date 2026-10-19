export const COLORS = [
  '#34d399', // emerald
  '#2dd4bf', // teal
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fb7185', // rose
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
];

export const ICONS = [
  '💧', '🏃', '📚', '🧘', '💪', '🥗', '😴', '🚭',
  '🍷', '📱', '✍️', '🎸', '🧹', '💊', '🚶', '🦷',
  '☀️', '🧠', '🎯', '❤️', '🍎', '☕', '🎨', '💰',
];

export const vibrate = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported.
  }
};
