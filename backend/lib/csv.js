function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(c.value(row))).join(',')).join('\n');
  return `${header}\n${body}`;
}

module.exports = { toCsv };
