import { Client } from "langsmith";
import { createClient } from "@supabase/supabase-js";

import * as ERR from "./message/error";

// langSmithクライアント
export const LangSmithClient = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
});

// supabase のクライアント
export const supabaseClient = () => {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) throw new Error(ERR.SUPABASE_KEY_ERROR);
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error(ERR.SUPABASE_URL_ERROR);

  const supabaseClient = createClient(url, supabaseKey);
  return supabaseClient;
};
