import Image from "next/image";

export const SCREEN: React.FC = () => {
  return (
    <div className="w-full flex justify-center">
      <div className="relative w-1/3 aspect-[1/1]">
        <Image src="/images/sensei.png" alt="サンプル画像" fill />
      </div>
    </div>
  );
};
