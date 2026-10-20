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

export const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Salute',
    icons: ['💧', '😴', '💊', '🦷', '🧴', '🩺', '❤️', '🫀', '🫁', '🌡️', '🧼', '🚿', '☀️', '🌙', '⚖️', '🩹'],
  },
  {
    label: 'Sport',
    icons: ['🏃', '🚶', '💪', '🎾', '🏋️', '🚴', '🏊', '🧘', '⚽', '🏀', '🏐', '🥾', '🤸', '🥊', '⛷️', '🏓'],
  },
  {
    label: 'Cibo',
    icons: ['🥗', '🍎', '🥦', '🥕', '🍌', '🥑', '🥛', '🍵', '☕', '🍳', '🥜', '🐟', '🍽️', '🫖', '🧃', '🍲'],
  },
  {
    label: 'Mente',
    icons: ['📚', '🧠', '✍️', '📝', '📖', '🎓', '🗣️', '🌍', '🧩', '♟️', '🎧', '🙏', '😊', '🌱', '🕯️', '💭'],
  },
  {
    label: 'Lavoro',
    icons: ['💻', '📅', '⏰', '✅', '📧', '📊', '💼', '🎯', '📌', '⌛', '🗂️', '📞', '🖊️', '📈', '🚀', '⭐'],
  },
  {
    label: 'Casa',
    icons: ['🧹', '🧺', '🛏️', '🪴', '🪟', '🗑️', '🧽', '🐶', '🐱', '👶', '👨‍👩‍👧', '🏠', '🔧', '🛒', '🚗', '💐'],
  },
  {
    label: 'Hobby',
    icons: ['🎸', '🎨', '📷', '🎹', '🎮', '🎬', '🧶', '🎤', '🪡', '🎲', '🌳', '⛰️', '🏕️', '✈️', '🎵', '🖌️'],
  },
  {
    label: 'Soldi',
    icons: ['💰', '💶', '🐷', '💳', '🧾', '🏦', '📉', '🪙'],
  },
  {
    label: 'Da evitare',
    icons: ['🚭', '🍷', '🍺', '📱', '🍫', '🍬', '🍔', '🍟', '🥤', '🎰', '📺', '🛍️', '😤', '🛋️', '⏳', '🚫'],
  },
];

/** All preset icons, without duplicates. */
export const ICONS = [...new Set(ICON_GROUPS.flatMap((g) => g.icons))];

export const vibrate = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Not supported.
  }
};
