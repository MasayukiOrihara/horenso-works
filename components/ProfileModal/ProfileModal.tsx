"use client";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useErrorStore } from "@/hooks/useErrorStore";
import { useSessionId } from "@/hooks/useSessionId";

import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/FramedCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as S from "@/components/ui/select";

import { requestApi } from "@/lib/api/request";
import { USERPROFILE_SAVE_PATH } from "@/lib/api/path";
import { userprofileFormValues, userprofileSchema } from "@/lib/schema";
import * as ERR from "@/lib/message/error";
import { useSessionFlags } from "../provider/SessionFlagsProvider";

/**
 * スタートボタンとプロフィール入力
 * @returns
 */
export const ProfileModal = () => {
  const { push } = useErrorStore();
  const { value: sessionFlags, merge, mergeOptions } = useSessionFlags();

  // 現在のセッション ID
  const sessionId = useSessionId();

  // form コントロール
  const { control, handleSubmit } = useForm<userprofileFormValues>({
    resolver: zodResolver(userprofileSchema),
    defaultValues: {
      name: "",
      gender: "none",
      country: "japan",
      company: "株式会社フリースタイル",
      organization: "other",
    },
  });

  // スタートボタンを押したときの処理
  const onSubmit = (values: userprofileFormValues) => {
    const payload = {
      name: values.name?.trim() ? values.name.trim() : "",
      gender: values.gender,
      country: values.country,
      company: values.company?.trim() ? values.company.trim() : "",
      organization: values.organization,
    };

    // ユーザープロファイルをサーバー側に送信
    (async () => {
      try {
        await requestApi("", USERPROFILE_SAVE_PATH, {
          method: "POST",
          body: { userprofile: payload, sessionId: sessionId },
        });
      } catch (error) {
        // エラー表示
        toast.error(`${ERR.USERPROFILE_SEND_ERROR}\n${ERR.RELOAD_BROWSER}`);

        const message =
          error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
        const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
        push({ message: ERR.USERPROFILE_SEND_ERROR, detail: stack || message });
      }
    })();
    // 画面遷移を行う

    merge({ sync: "local" });
  };

  // 開始中なら何もしない
  if (sessionFlags.sync !== "idle" || sessionFlags.options.debugOn) return null;

  return (
    <div>
      {sessionFlags.sync === "idle" && (
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
                  <Label htmlFor="country">🌍 出身地</Label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <S.Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <S.SelectTrigger id="country">
                          <S.SelectValue placeholder="国を選択" />
                        </S.SelectTrigger>
                        <S.SelectContent>
                          <S.SelectItem value="japan">日本</S.SelectItem>
                          <S.SelectItem value="usa">アメリカ</S.SelectItem>
                          <S.SelectItem value="other">その他</S.SelectItem>
                        </S.SelectContent>
                      </S.Select>
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
                        placeholder="例）株式会社フリースタイル"
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
                      <S.Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <S.SelectTrigger id="organization">
                          <S.SelectValue placeholder="所属を選択" />
                        </S.SelectTrigger>
                        <S.SelectContent>
                          <S.SelectItem value="dev">開発</S.SelectItem>
                          <S.SelectItem value="sales">営業</S.SelectItem>
                          <S.SelectItem value="hr">人事</S.SelectItem>
                          <S.SelectItem value="other">その他</S.SelectItem>
                        </S.SelectContent>
                      </S.Select>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full hover:cursor-pointer">
                  スタート
                </Button>
                <h2 className="text-zinc-500 text-sm text-center">
                  入力した情報は本アプリ内でのみ使用されます。
                </h2>
              </form>

              {/** デバックボタン */}
              <div className="flex items-center justify-center">
                <Button
                  onClick={() => mergeOptions({ debugOn: true })}
                  variant={"ghost"}
                  size={"md"}
                  className="mb-1 h-7"
                >
                  デバッグ
                </Button>
                {/** この辺にデバック用のステッパー */}
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    onClick={() =>
                      merge({ step: Math.max(0, sessionFlags.step - 1) })
                    }
                    variant={"ghost"}
                    className="px-2 py-1 bg-gray-200/20"
                  >
                    -
                  </Button>
                  <span className="w-2 text-center">{sessionFlags.step}</span>
                  <Button
                    onClick={() =>
                      merge({
                        step: Math.max(0, Math.min(1, sessionFlags.step + 1)),
                      })
                    }
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
