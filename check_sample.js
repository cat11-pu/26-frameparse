import fs from "node:fs";
import { parse } from "./frame.js";
import { reassemble } from "./reasm.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/frame.json", "utf8"));
const parsed = parse(spec.bytes, spec.header, spec.frame_size);
const group = reassemble(spec.fragments || [], spec.timeout_ticks);
const out = render(spec);

console.log("解析出的帧 =", JSON.stringify(parsed.frames.map((frame) => frame.id)));
console.log("帧体内容 =", JSON.stringify(parsed.frames.map((frame) => frame.body)));
console.log("残帧字节数 =", parsed.leftover);
console.log("重同步次数 =", parsed.resyncs);
console.log("按序交付的分片 =", JSON.stringify(group.delivered));
console.log("超时丢弃的分片 =", JSON.stringify(group.dropped));
console.log("仍在等待的分片 =", JSON.stringify(group.pending));
console.log("校验失败的错误码 =", spec.resync_code);
