import type { HistoryRow } from "../db/nominations.js";

// A nomination needs >=1 vote to qualify; ranked by votes desc, then
// earliest created_at; all ties at 3rd place are included.
export function computeTop3(rows: HistoryRow[]): HistoryRow[] {
  const qualifying = rows.filter((r) => r.votes >= 1);
  const sorted = [...qualifying].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.createdAt.localeCompare(b.createdAt);
  });

  if (sorted.length <= 3) return sorted;

  const thirdPlaceVotes = sorted[2]!.votes;
  let cutoff = 3;
  while (cutoff < sorted.length && sorted[cutoff]!.votes === thirdPlaceVotes) {
    cutoff++;
  }
  return sorted.slice(0, cutoff);
}
