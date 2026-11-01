
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const SOCIETY_FLATS_ORDER = [
  // Block NNG: GF1..3, FF1..3, SF1..3, TF1..3
  'NNG-GF1', 'NNG-GF2', 'NNG-GF3',
  'NNG-FF1', 'NNG-FF2', 'NNG-FF3',
  'NNG-SF1', 'NNG-SF2', 'NNG-SF3',
  'NNG-TF1', 'NNG-TF2', 'NNG-TF3',

  // Block NB: GF1..3, FF1..3, SF1..3, TF1..3, PH1
  'NB-GF1', 'NB-GF2', 'NB-GF3',
  'NB-FF1', 'NB-FF2', 'NB-FF3',
  'NB-SF1', 'NB-SF2', 'NB-SF3',
  'NB-TF1', 'NB-TF2', 'NB-TF3',
  'NB-PH1'
];

export const getFlatRank = (item) => {
  if (!item) return 9999;
  let raw = typeof item === 'string' 
    ? item 
    : (item.unit_number || item.unit || item.flat_number || '');
  raw = String(raw).toUpperCase().trim();

  if (typeof item === 'object' && item !== null) {
    const block = (item.block || '').toUpperCase().trim();
    const flat = (item.flat_number || '').toUpperCase().trim();
    if (block && flat && (!raw || raw === flat)) {
      raw = `${block}-${flat}`;
    }
  }

  // Exact canonical match
  const idx = SOCIETY_FLATS_ORDER.indexOf(raw);
  if (idx !== -1) return idx;

  // Normalized matching (e.g. "NNG GF1" -> "NNG-GF1", "NB PH-1" -> "NB-PH1")
  const norm = raw.replace(/\s+/g, '-').replace(/--+/g, '-');
  const normIdx = SOCIETY_FLATS_ORDER.indexOf(norm);
  if (normIdx !== -1) return normIdx;

  // Programmatic fallback
  let blockScore = 2000;
  let remainder = norm;
  if (norm.startsWith('NNG')) {
    blockScore = 0;
    remainder = norm.replace(/^NNG[-_ ]*/, '');
  } else if (norm.startsWith('NB')) {
    blockScore = 1000;
    remainder = norm.replace(/^NB[-_ ]*/, '');
  }

  let floorScore = 90;
  if (remainder.startsWith('GF') || remainder.startsWith('G')) floorScore = 10;
  else if (remainder.startsWith('FF') || remainder.startsWith('F') || remainder.startsWith('1F')) floorScore = 20;
  else if (remainder.startsWith('SF') || remainder.startsWith('S') || remainder.startsWith('2F')) floorScore = 30;
  else if (remainder.startsWith('TF') || remainder.startsWith('T') || remainder.startsWith('3F')) floorScore = 40;
  else if (remainder.startsWith('PH') || remainder.includes('PENTHOUSE')) floorScore = 50;

  const numMatch = remainder.match(/\d+/);
  const numScore = numMatch ? parseInt(numMatch[0], 10) : 0;
  return blockScore + floorScore + numScore;
};

export const sortFlats = (a, b) => {
  const rankA = getFlatRank(a);
  const rankB = getFlatRank(b);
  if (rankA !== rankB) return rankA - rankB;
  const strA = typeof a === 'string' ? a : (a?.unit_number || a?.unit || '');
  const strB = typeof b === 'string' ? b : (b?.unit_number || b?.unit || '');
  return strA.localeCompare(strB, undefined, { numeric: true });
};
