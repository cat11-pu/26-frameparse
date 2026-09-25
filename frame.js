// frame.js：帧状态机（基线：按固定长度切，不校验）
export function parse(bytes, header, frameSize) {
  const frames = [];
  for (let start = 0; start + frameSize <= bytes.length; start += frameSize) {
    frames.push({ id: frames.length, body: bytes.slice(start, start + frameSize) });
  }
  return { frames: frames, leftover: bytes.length % frameSize, resyncs: 0 };
}
