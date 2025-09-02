"use client";

import { z } from "zod";

import { useStartButton } from "../provider/start-button-provider";
import { Button } from "../ui/button";
import { FramedCard } from "../ui/FramedCard";

import { useForm, Controller } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Schema = z.object({
  name: z.string().trim().max(50),
  gender: z.enum(["male", "female", "none"]),
  country: z.enum(["japan", "usa", "other"]),
  company: z.string().trim().max(50),
  organization: z.enum(["dev", "sales", "hr", "other"]),
});
type FormValues = z.infer<typeof Schema>;

export const StartButton = () => {
  const { started, setStarted, debug, setDebug, step, setStep } =
    useStartButton();

  // form コントロール
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      gender: "none",
      country: "japan",
      company: "株式会社フリースタイル",
      organization: "other",
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name?.trim() ? values.name.trim() : null,
      gender: values.gender === "none" ? null : values.gender,
    };
    console.log("submit:", payload);
    // API / LLMへ
  };

  // 開始中なら何もしない
  if (started || debug) return null;

  // 提出用関数
  // function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  //   e.preventDefault();
  //   const fd = new FormData(e.currentTarget);
  // }

  return (
    <div>
      {!started && (
        <div className="absolute [width:calc(100%-3.5rem)] [height:calc(100%-2.75rem)] bg-zinc-600/60 z-30 overflow-hidden">
          <div className="flex flex-col items-center justify-start pt-44 h-screen ">
            <FramedCard title="プロフィールを入力(任意)" align="center">
              <h2 className="text-zinc-500 text-sm  text-center">
                あなたの情報を入力すると、その情報に沿った回答を返します。
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                {/** 名前入力 */}
                <div className="mb-4 space-y-2">
                  <Label htmlFor="name">👤 名前</Label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Input
                        id="name"
                        placeholder="例）山田太郎"
                        autoComplete="name"
                        {...field}
                      />
                    )}
                  />
                </div>

                {/** 性別セット */}
                <fieldset className="mb-4">
                  <legend className="mb-1 text-sm font-medium">⚧ 性別</legend>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        aria-label="性別"
                        className="flex"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id="rg-male" value="male" />
                          <Label htmlFor="rg-male">男性</Label>
                        </div>
                        <div className="ml-2 flex items-center space-x-2">
                          <RadioGroupItem id="rg-female" value="female" />
                          <Label htmlFor="rg-female">女性</Label>
                        </div>
                        <div className="ml-2 flex items-center space-x-2">
                          <RadioGroupItem id="rg-none" value="none" />
                          <Label htmlFor="rg-none">選択しない</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </fieldset>

                {/** 国籍 */}
                <div className="mb-4 space-y-2">
                  <Label htmlFor="country">🌍 国</Label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="国を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="japan">日本</SelectItem>
                          <SelectItem value="usa">アメリカ</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/** 会社入力 */}
                <div className="mb-4 space-y-2">
                  <Label htmlFor="company">🏢 会社</Label>
                  <Controller
                    control={control}
                    name="company"
                    render={({ field }) => (
                      <Input
                        id="company"
                        placeholder="例）山田太郎"
                        autoComplete="company"
                        {...field}
                      />
                    )}
                  />
                </div>

                <div className="mb-4 space-y-2">
                  <Label htmlFor="organization">所属</Label>
                  <Controller
                    control={control}
                    name="organization"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger id="organization">
                          <SelectValue placeholder="所属を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dev">開発</SelectItem>
                          <SelectItem value="sales">営業</SelectItem>
                          <SelectItem value="hr">人事</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  onClick={() => setStarted(true)}
                  className="w-full hover:cursor-pointer"
                >
                  スタート
                </Button>
                <h2 className="text-zinc-500 text-sm text-center">
                  入力した情報は本アプリ内でのみ使用されます。
                </h2>
              </form>

              {/** デバックボタン */}
              <div className="flex items-center justify-center">
                <Button
                  onClick={() => setDebug(true)}
                  variant={"ghost"}
                  size={"md"}
                  className="mb-1 h-7"
                >
                  デバッグ
                </Button>
                {/** この辺にデバック用のステッパー */}
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    onClick={() => setStep((v) => Math.max(0, v - 1))}
                    variant={"ghost"}
                    className="px-2 py-1 bg-gray-200/20"
                  >
                    -
                  </Button>
                  <span className="w-2 text-center">{step}</span>
                  <Button
                    onClick={() => setStep((v) => Math.min(1, v + 1))}
                    variant={"ghost"}
                    className="px-2 py-1 bg-gray-200/20"
                  >
                    +
                  </Button>
                </div>
              </div>
            </FramedCard>
          </div>
        </div>
      )}
    </div>
  );
};
