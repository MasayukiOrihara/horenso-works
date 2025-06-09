import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const text = readFileSync(
    path.join(process.cwd(), "learn", "learn-default.txt"),
    "utf-8"
  );
  return Response.json({ text });
}
