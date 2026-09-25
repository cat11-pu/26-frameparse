// reasm.js：按序号重组（序号从 0 起连续才交付，等待超过 timeoutTicks 轮则丢弃）
//
// 处理规则：
// - 分片按到达轮次 arrived 分批推进；同一轮到达的按输入顺序处理；
// - 从期望序号 expect（初始 0）起连续存在时立即交付，严格按 0,1,2,... 递增；
// - 后续序号的分片留在等待队列；其等待轮次 = 当前轮次 - 到达轮次，
//   一旦 > timeoutTicks 即移入 dropped；
// - 最后一轮处理完后仍在等待队列中的分片按序号升序作为 pending 返回。

export function reassemble(fragments, timeoutTicks) {
  const delivered = [];
  const dropped = [];
  const waiting = new Map(); // seq -> { id, arrived }
  let expect = 0;

  const ordered = [...fragments].sort((a, b) => {
    if (a.arrived !== b.arrived) return a.arrived - b.arrived;
    return 0; // 同一到达轮次保持输入顺序
  });

  const expire = (now) => {
    for (const [seq, fragment] of waiting) {
      if (now - fragment.arrived > timeoutTicks) {
        waiting.delete(seq);
        dropped.push(fragment.id);
      }
    }
  };

  const flush = () => {
    while (waiting.has(expect)) {
      delivered.push(waiting.get(expect).id);
      waiting.delete(expect);
      expect += 1;
    }
  };

  let index = 0;
  while (index < ordered.length) {
    const now = ordered[index].arrived;

    expire(now); // 先按当前轮淘汰超时分片

    while (index < ordered.length && ordered[index].arrived === now) {
      const fragment = ordered[index];
      index += 1;
      if (fragment.seq === expect) {
        delivered.push(fragment.id);
        expect += 1;
      } else if (fragment.seq > expect && !waiting.has(fragment.seq)) {
        waiting.set(fragment.seq, { id: fragment.id, arrived: fragment.arrived });
      } else {
        dropped.push(fragment.id); // 重复或乱序回退的分片无位可放
      }
    }

    flush(); // 本轮到达补上了空洞，连带交付后续已在等待的连续分片
  }

  const lastTick = ordered.length ? ordered[ordered.length - 1].arrived : 0;
  expire(lastTick); // 结束前再做一次超时判定

  const pending = [...waiting.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, fragment]) => fragment.id);

  return { delivered, dropped, pending };
}
