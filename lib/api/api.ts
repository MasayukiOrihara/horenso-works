/** フロント側での API 呼び出し */

/* id の項目を not-corect-json に移動させる */
export async function semanticMatchJsonMoveAPI(id: string) {
  const res = await fetch(`/api/semantic-match-json/move/${id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  return await res.json();
}

/* semantic-Match-Json から id の項目を削除する */
export async function semanticMatchJsonDeleteAPI(id: string) {
  await fetch(`/api/semantic-match-json/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

export async function getUserAnswerDataApi() {
  return await fetch("/api/user-answer-data", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}
