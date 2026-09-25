// frame.js：固定长度帧状态机
// 帧 = 帧头(header) + 帧体(frameSize - header.length)；帧体后随 1 字节校验（帧体各字节 XOR）。
// 一次线性扫描：游标只前进；帧体不足保留为残帧；校验失败报 E_BAD_CHECKSUM 并重同步，不中断解析。

export const BAD_CHECKSUM = "E_BAD_CHECKSUM";

export function parse(bytes, header, frameSize) {
  const frames = [];
  const errors = [];
  const length = bytes.length;
  const headerLength = header.length;
  const isString = typeof bytes === "string";
  const codeAt = (index) => (isString ? bytes.charCodeAt(index) : bytes[index]);
  const headerCodes = Array.from(header, (char) =>
    typeof char === "string" ? char.charCodeAt(0) : char
  );

  let cursor = 0;
  let resyncs = 0;

  function headerAt(position) {
    if (position + headerLength > length) return false;
    for (let offset = 0; offset < headerLength; offset += 1) {
      if (codeAt(position + offset) !== headerCodes[offset]) return false;
    }
    return true;
  }

  while (cursor < length) {
    // 找帧头标记：找不到就逐字节跳过（跳过之后仍能找到帧头才计重同步）
    let position = cursor;
    while (position < length && !headerAt(position)) position += 1;
    if (position >= length) break;
    resyncs += position - cursor;

    // 帧头之后取不满一帧帧体：残帧，连同帧头一起保留到下一轮
    if (position + frameSize > length) {
      cursor = position;
      break;
    }

    const bodyStart = position + headerLength;
    const bodyEnd = position + frameSize;
    let checksum = 0;
    for (let index = bodyStart; index < bodyEnd; index += 1) {
      checksum ^= codeAt(index);
    }

    frames.push({
      id: frames.length,
      body: isString ? bytes.slice(bodyStart, bodyEnd) : bytes.slice(bodyStart, bodyEnd),
    });
    cursor = bodyEnd;

    // 校验字节缺失（正好到流尾）不做判定；失败则报错并触发一次重同步
    if (cursor < length && codeAt(cursor) !== checksum) {
      errors.push({ code: BAD_CHECKSUM, at: cursor });
      resyncs += 1;
    }
  }

  return { frames, leftover: length - cursor, resyncs, errors };
}
