// frame.js：固定长度帧状态机（单游标线性扫描，游标只前进不回退）
//
// 帧 = 帧头 header + 帧体（frameSize - header.length 字节），帧体最后一个字节是校验字节：
// 帧体全部字节之和模 3 必须为 1，否则该候选帧判 E_BAD_CHECKSUM，
// 跳过当前字节（帧头首字节）后继续寻找帧头，解析不中断。
//
// 计数口径：
// - 找不到帧头而逐字节跳过、以及校验失败跳过时，每次重同步恰好丢弃 1 个字节，resyncs +1；
// - 帧头之后帧体不足（直到流尾）时整段保留为残帧，计入 leftover；
// - 上一帧之后直到流尾再找不到帧头的尾部也整体保留（等待下一段流续接），计入 leftover；
// - 不变量：leftover + resyncs + 已解析字节数 = bytes.length。
//
// 重叠帧头：某帧最后一个字节（校验字节）恰好又是帧头起点时，游标停在该字节上重判一次：
// 它要么真是下一帧的帧头，要么因校验失败被当作重同步字节丢弃。游标依旧单调前进。

const CHECKSUM_MODULUS = 3;
const CHECKSUM_REMAINDER = 1;

function asView(bytes) {
  if (typeof bytes === "string") {
    return {
      length: bytes.length,
      at: (i) => bytes.charCodeAt(i),
      part: (start, end) => bytes.slice(start, end),
    };
  }
  return {
    length: bytes.length,
    at: (i) => bytes[i],
    part: (start, end) => bytes.slice(start, end),
  };
}

export function parse(bytes, header, frameSize) {
  const view = asView(bytes);
  const headerCodes =
    typeof header === "string" ? [...header].map((ch) => ch.charCodeAt(0)) : [...header];
  const headerLength = headerCodes.length;

  const frames = [];
  const errors = [];
  let cursor = 0;
  let resyncs = 0;
  let leftover = 0;

  const headerAt = (pos) => {
    if (pos + headerLength > view.length) return false;
    for (let i = 0; i < headerLength; i += 1) {
      if (view.at(pos + i) !== headerCodes[i]) return false;
    }
    return true;
  };

  const checksumOk = (pos) => {
    let sum = 0;
    for (let i = headerLength; i < frameSize; i += 1) sum += view.at(pos + i);
    return sum % CHECKSUM_MODULUS === CHECKSUM_REMAINDER;
  };

  while (cursor < view.length) {
    // 1) 线性寻找帧头：scan 只在 cursor 之前方向移动，中间跳过的字节逐字节计重同步
    const scanStart = cursor;
    while (cursor < view.length && !headerAt(cursor)) cursor += 1;
    resyncs += cursor - scanStart;

    if (cursor >= view.length) {
      // 尾部再无帧头：整段保留为残帧，等下一段流续接；此前未找到帧头时不丢弃任何字节
      leftover = view.length - scanStart;
      resyncs -= view.length - scanStart;
      break;
    }

    // 2) 帧头之后取不满一帧 => 残帧（帧头一并保留）
    if (cursor + frameSize > view.length) {
      leftover = view.length - cursor;
      break;
    }

    // 3) 取满一帧，校验
    if (!checksumOk(cursor)) {
      errors.push({ code: "E_BAD_CHECKSUM", at: cursor });
      resyncs += 1; // 跳过当前字节（帧头首字节），从下一个字节继续找帧头
      cursor += 1;
      continue;
    }

    frames.push({
      id: frames.length,
      body: view.part(cursor + headerLength, cursor + frameSize),
    });

    // 4) 帧尾若与下一帧帧头起点重叠，游标停在重叠字节上重判；否则整帧越过
    const frameEnd = cursor + frameSize;
    const overlap = frameEnd - 1;
    cursor = headerAt(overlap) ? overlap : frameEnd;
  }

  return { frames, leftover, resyncs, errors };
}
