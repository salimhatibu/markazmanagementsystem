export const CHECK_IN_GAPS_MS = [30 * 60 * 1000, 60 * 60 * 1000] as const;

const VERSE_TURN_KEY = "markaz_check_in_verse";
const GAP_INDEX_KEY = "markaz_check_in_gap";
const DUE_KEY = "markaz_check_in_due";

function readGapIndex(): number {
  try {
    const index = Number(sessionStorage.getItem(GAP_INDEX_KEY) ?? "0");
    if (!Number.isFinite(index) || index < 0) return 0;
    return index % CHECK_IN_GAPS_MS.length;
  } catch {
    return 0;
  }
}

export function peekCheckInDelay(now = Date.now()): number {
  try {
    let due = Number(sessionStorage.getItem(DUE_KEY) ?? "0");
    if (!Number.isFinite(due) || due <= 0) {
      due = now + CHECK_IN_GAPS_MS[readGapIndex()];
      sessionStorage.setItem(DUE_KEY, String(due));
    }
    return Math.max(0, due - now);
  } catch {
    return CHECK_IN_GAPS_MS[0];
  }
}

export function commitNextCheckIn(now = Date.now()): number {
  const next = (readGapIndex() + 1) % CHECK_IN_GAPS_MS.length;
  try {
    sessionStorage.setItem(GAP_INDEX_KEY, String(next));
    sessionStorage.setItem(DUE_KEY, String(now + CHECK_IN_GAPS_MS[next]));
  } catch {
    /* ignore quota */
  }
  return CHECK_IN_GAPS_MS[next];
}

export type ComfortVerse = {
  ref: string;
  arabic: string;
  english: string;
};

export const COMFORT_VERSES: ComfortVerse[] = [
  {
    ref: "Surah Al-Baqarah (2:286)",
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    english: "Allah does not burden a soul beyond that it can bear.",
  },
  {
    ref: "Surah Al-Anbiya (21:83)",
    arabic: "وَأَيُّوبَ إِذْ نَادَىٰ رَبَّهُ أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ",
    english: "Indeed, adversity has touched me, and You are the most merciful of the merciful.",
  },
  {
    ref: "Surah Ar-Ra'd (13:28)",
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    english: "Unquestionably, by the remembrance of Allah hearts are assured.",
  },
  {
    ref: "Surah Al-Isra (17:82)",
    arabic: "وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ",
    english: "And We send down of the Quran that which is healing and mercy for the believers.",
  },
  {
    ref: "Surah Al-Baqarah (2:153)",
    arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    english: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
  },
  {
    ref: "Surah Az-Zumar (39:53)",
    arabic:
      "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ",
    english:
      "Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful.",
  },
  {
    ref: "Surah At-Talaq (65:3)",
    arabic:
      "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا",
    english:
      "And He will provide for him from where he does not expect. And whoever relies upon Allah — then He is sufficient for him. Indeed, Allah will accomplish His purpose. Allah has already set for everything a due measure.",
  },
  {
    ref: "Surah Al-Ankabut (29:69)",
    arabic: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ",
    english:
      "And those who strive for Us — We will surely guide them to Our ways. And indeed, Allah is with the doers of good.",
  },
];

export function nextComfortVerse(): ComfortVerse {
  let index = 0;
  try {
    index = Number(sessionStorage.getItem(VERSE_TURN_KEY) ?? "0");
  } catch {
    index = 0;
  }
  if (!Number.isFinite(index) || index < 0) index = 0;
  const verse = COMFORT_VERSES[index % COMFORT_VERSES.length];
  try {
    sessionStorage.setItem(VERSE_TURN_KEY, String((index + 1) % COMFORT_VERSES.length));
  } catch {
    /* ignore quota */
  }
  return verse;
}
