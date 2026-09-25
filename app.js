// app.js：渲染结果
import { parse } from "./frame.js";
import { reassemble } from "./reasm.js";

export function render(spec) {
  const parsed = parse(spec.bytes, spec.header, spec.frame_size);
  const group = reassemble(spec.fragments || [], spec.timeout_ticks);
  return { frames: parsed.frames.map((frame) => frame.id), leftover: parsed.leftover,
           resyncs: parsed.resyncs, delivered: group.delivered,
           dropped: group.dropped, pending: group.pending };
}
