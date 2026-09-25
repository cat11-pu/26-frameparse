// reasm.js：按序号重组分片
// 仅从序号 0 起连续交付；缺口之后到达的留在等待队列；等待轮次超过 timeoutTicks 的丢弃。

export function reassemble(fragments, timeoutTicks) {
  const delivered = [];
  const dropped = [];
  const waiting = new Map();
  let nextSeq = 0;

  const flush = () => {
    while (waiting.has(nextSeq)) {
      delivered.push(waiting.get(nextSeq).id);
      waiting.delete(nextSeq);
      nextSeq += 1;
    }
  };

  const expire = (tick) => {
    for (const [seq, fragment] of waiting) {
      if (tick - fragment.arrived > timeoutTicks) {
        dropped.push(fragment.id);
        waiting.delete(seq);
      }
    }
  };

  const ordered = Array.from(fragments).sort((a, b) => a.arrived - b.arrived);
  let lastTick = null;
  for (const fragment of ordered) {
    if (lastTick !== fragment.arrived) {
      expire(fragment.arrived);
      lastTick = fragment.arrived;
    }
    if (fragment.seq < nextSeq || waiting.has(fragment.seq)) continue;
    waiting.set(fragment.seq, { id: fragment.id, arrived: fragment.arrived });
    flush();
  }

  return { delivered, dropped, pending: Array.from(waiting.values(), (fragment) => fragment.id) };
}
