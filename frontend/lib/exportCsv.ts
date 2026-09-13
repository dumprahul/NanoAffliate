import type { PayoutEvent } from './types';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportPayoutsCsv(events: PayoutEvent[]): void {
  const headers = [
    'id',
    'kind',
    'status',
    'amount_hbar',
    'tx_id',
    'from_account',
    'to_account',
    'link_topic_id',
    'detail',
    'created_at',
  ];
  const rows = events.map((e) =>
    [
      e.id,
      e.kind,
      e.status,
      String(e.amount_hbar),
      e.tx_id ?? '',
      e.from_account,
      e.to_account,
      e.link_topic_id,
      e.detail,
      e.created_at,
    ]
      .map(csvEscape)
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nanoaffiliate-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
