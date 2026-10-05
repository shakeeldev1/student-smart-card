/**
 * "Golden" card numbers — special, memorable 8-digit suffixes that are reserved
 * from the random generator and handed out to VIP cardholders by an admin.
 *
 * A suffix is golden if it matches ANY of these families:
 *  - all-same            e.g. 11111111
 *  - two-digit repeat    e.g. 12121212          (AB AB AB AB)
 *  - four + four         e.g. 11112222          (AAAA BBBB)
 *  - four-digit repeat   e.g. 01230123          (ABCD ABCD)
 *  - paired digits       e.g. 00112233          (AA BB CC DD)
 *  - palindrome / mirror e.g. 12344321, 10000001
 *  - running sequence    e.g. 12345678, 98765432 (constant +/-1 step, wrapping)
 */
// A few explicitly-reserved numbers that don't fit a standard family but were
// requested as golden (the "0 + dddd + 000" group).
const EXTRA_GOLDEN = new Set([
  '01111000', '02222000', '03333000', '04444000', '05555000',
  '06666000', '07777000', '08888000', '09999000',
]);

export function isGoldenSuffix(suffix: string): boolean {
  if (!/^\d{8}$/.test(suffix)) return false;
  const s = suffix;
  if (EXTRA_GOLDEN.has(s)) return true;
  const d = s.split('').map(Number);

  const allSame = new Set(s).size === 1;
  const twoRepeat = s === s.slice(0, 2).repeat(4);
  const fourFour = new Set(s.slice(0, 4)).size === 1 && new Set(s.slice(4)).size === 1;
  const fourRepeat = s.slice(0, 4) === s.slice(4);
  const paired = d[0] === d[1] && d[2] === d[3] && d[4] === d[5] && d[6] === d[7];
  const palindrome = s === s.split('').reverse().join('');

  let asc = true;
  let desc = true;
  for (let i = 1; i < 8; i += 1) {
    const step = (d[i] - d[i - 1] + 10) % 10;
    if (step !== 1) asc = false;
    if (step !== 9) desc = false;
  }
  const sequence = asc || desc;

  return allSame || twoRepeat || fourFour || fourRepeat || paired || palindrome || sequence;
}

/** A small, curated set of examples per family for the admin UI. */
export const GOLDEN_EXAMPLES: Array<{ family: string; samples: string[] }> = [
  { family: 'Repeating digit', samples: ['11111111', '77777777', '00000000'] },
  { family: 'Two-digit repeat', samples: ['12121212', '50505050', '98989898'] },
  { family: 'Four + four', samples: ['11112222', '00009999', '55550000'] },
  { family: 'Block repeat', samples: ['01230123', '12341234', '00110011'] },
  { family: 'Paired digits', samples: ['00112233', '11223344', '55667788'] },
  { family: 'Mirror / palindrome', samples: ['12344321', '10000001', '12222221'] },
  { family: 'Running sequence', samples: ['12345678', '23456789', '98765432'] },
];
