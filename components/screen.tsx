import Image from "next/image";
import { useSessionFlags } from "./provider/SessionFlagsProvider";

export const SCREEN: React.FC = () => {
  const { value: sessionFlags } = useSessionFlags();

  // 動作開始前
  const isIdle = sessionFlags.sync === "idle" || sessionFlags.sync === "init";
  const isDebug = sessionFlags.options.debugOn;

  return (
    <div className="w-full flex justify-center">
      <div
        className={`relative w-1/3 aspect-[1/1] transition-opacity duration-1000 ease-in-out ${
          !isIdle && !isDebug ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image src="/images/sensei.png" alt="サンプル画像" fill />
      </div>
    </div>
  );
};
