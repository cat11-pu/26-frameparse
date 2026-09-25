// reasm.js：分片重组（基线：按到达顺序交付）
export function reassemble(fragments, timeoutTicks) {
  return { delivered: fragments.map((fragment) => fragment.id), dropped: [], pending: [] };
}
