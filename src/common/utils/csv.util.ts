export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const escape = (value: string | number | null | undefined): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}
