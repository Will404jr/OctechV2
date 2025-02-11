import { createReadStream } from "fs";
import { join } from "path";

export default function handler(req, res) {
  const { path } = req.query;
  const filePath = join(process.cwd(), "uploads", ...path);
  const stream = createReadStream(filePath);
  stream.pipe(res);
}
