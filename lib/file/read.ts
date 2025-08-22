import fs from "fs";

// Json fileの読み込み
export const readJson = (path: string) => {
  if (fs.existsSync(path) && fs.statSync(path).size > 0) {
    const raw = fs.readFileSync(path, "utf-8");
    return JSON.parse(raw);
  }

  return [];
};
