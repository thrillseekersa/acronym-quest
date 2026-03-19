// Deterministic daily acronym selection
// Uses the date as a seed to pick the same 30 acronyms for all users on the same day

export function getDailyAcronyms(allAcronyms, count = 30) {
  if (allAcronyms.length <= count) return [...allAcronyms];

  // Create a seed from today's date (YYYY-MM-DD)
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  
  // Simple hash function for the seed
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed << 5) - seed + dateStr.charCodeAt(i)) | 0;
  }

  // Seeded pseudo-random shuffle (Fisher-Yates with seed)
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  }

  const shuffled = [...allAcronyms];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
