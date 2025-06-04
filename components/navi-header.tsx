import { Button } from "./ui/button";

export const Navi: React.FC = () => {
  return (
    <div className="sticky top-0 z-10 px-12 py-4 flex items-center justify-between">
      <Button variant="link" className="bg-white/40 hover:bg-white/80 rounded">
        ＜ 前の問題
      </Button>
      <Button variant="outline" className="rounded">
        トップ画面に戻る
      </Button>
      <Button variant="link" className="bg-white/40 hover:bg-white/80 rounded">
        次の問題 ＞
      </Button>
    </div>
  );
};
