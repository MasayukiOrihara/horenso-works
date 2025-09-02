import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Schema = z.object({
  //   name: z.string().trim().max(50).or(z.literal("")),
  //   gender: z.enum(["male", "female", "none"]).default("none"),
  name: z.string().trim().max(50),
  gender: z.enum(["male", "female", "none"]),
});
type FormValues = z.infer<typeof Schema>;

export default function StartProfileForm() {
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", gender: "none" },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name?.trim() ? values.name.trim() : null,
      gender: values.gender === "none" ? null : values.gender,
    };
    console.log("submit:", payload);
    // API / LLMへ
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
    >
      <h2 className="mb-4 text-xl font-semibold">プロフィールを入力</h2>

      <div className="mb-4 space-y-2">
        <Label htmlFor="name">名前（任意）</Label>
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

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium">性別（任意）</legend>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              aria-label="性別"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="rg-male" value="male" />
                <Label htmlFor="rg-male">男性</Label>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <RadioGroupItem id="rg-female" value="female" />
                <Label htmlFor="rg-female">女性</Label>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <RadioGroupItem id="rg-none" value="none" />
                <Label htmlFor="rg-none">選択しない</Label>
              </div>
            </RadioGroup>
          )}
        />
      </fieldset>

      <Button type="submit" className="w-full">
        スタート
      </Button>
      <Button
        type="submit"
        variant="ghost"
        className="mt-2 w-full"
        // 送信時に gender: "none", name: "" ならそのまま null 変換して扱える
      >
        スキップして進む
      </Button>
    </form>
  );
}
