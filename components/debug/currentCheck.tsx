import { useEffect, useState } from "react";
import { useUserMessages } from "../messages/message-provider";
import { UserAnswerEvaluation } from "@/lib/type";
import { Button } from "../ui/button";

export const CurrentCheck: React.FC = () => {
  const { aiState } = useUserMessages();
  const [userAnswerData, setuserAnswerData] = useState<UserAnswerEvaluation[]>(
    []
  );

  console.log(aiState);
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/userAnswerData", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      setuserAnswerData(json);
    };
    fetchData();
    console.log(JSON.stringify(userAnswerData));
  }, [aiState]);

  return (
    <div className="w-full flex justify-center">
      {userAnswerData &&
        userAnswerData.map((data) => (
          <div key={data.semanticId}>
            この回答の判定は正しいですか？
            <div>
              ユーザーの回答: <span>{data.userAnswer}</span>
            </div>
            <div>
              正答: <span>{data.currentAnswer}</span>
            </div>
            <div>
              正答理由: <span>{data.semanticReason}</span>
            </div>
            <div>
              <Button>yes</Button>
              <Button>no</Button>
            </div>
          </div>
        ))}
    </div>
  );
};
