import { useMessages } from "../messages/message-provider";

// 交互にマージする関数
function mergeAlternating(user: string[], ai: string[]) {
  const result = [];
  const maxLength = Math.max(user.length, ai.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < user.length) result.push("user: " + user[i]);
    if (i < ai.length) result.push("ai: " + ai[i]);
  }
  return result;
}

export const SidebarHistory: React.FC = () => {
  const { userMessages, aiMessages } = useMessages();

  return (
    <div>
      <nav className="p-4 space-y-1 text-sm text-zinc-500">
        {mergeAlternating(userMessages, aiMessages).map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </nav>
    </div>
  );
};
