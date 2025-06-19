import Image from "next/image";
import { useStartButton } from "./provider/start-button-provider";

export const SCREEN: React.FC = () => {
  const { started } = useStartButton();

  // if (!started) return null;

  return (
    <div className="w-full flex justify-center">
      <div
        className={`relative w-1/3 aspect-[1/1] transition-opacity duration-1000 ease-in-out ${
          started ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image src="/images/sensei.png" alt="サンプル画像" fill />
      </div>
    </div>
  );
};
