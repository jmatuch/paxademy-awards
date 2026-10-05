export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

export function mentionList(userIds: string[]): string {
  const mentions = userIds.map((id) => `<@${id}>`);
  if (mentions.length === 1) return mentions[0]!;
  if (mentions.length === 2) return `${mentions[0]} and ${mentions[1]}`;
  return `${mentions.slice(0, -1).join(", ")}, and ${mentions.at(-1)}`;
}
