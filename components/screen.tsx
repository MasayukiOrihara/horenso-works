import Image from "next/image";

export const SCREEN: React.FC = () => {
  return (
    <div className="w-full flex justify-center">
      <Image
        src="/images/sensei.png"
        alt="サンプル画像"
        className="w-1/3 h-full"
      />
    </div>
  );
};
