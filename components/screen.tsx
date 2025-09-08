import Image from "next/image";
import { useSessionFlags } from "./provider/SessionFlagsProvider";

export const SCREEN: React.FC = () => {
  const { value: sessionFlags } = useSessionFlags();

  return (
    <div className="w-full flex justify-center">
      <div
        className={`relative w-1/3 aspect-[1/1] transition-opacity duration-1000 ease-in-out ${
          sessionFlags.sync !== "idle" ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image src="/images/sensei.png" alt="サンプル画像" fill />
      </div>
    </div>
  );
};
