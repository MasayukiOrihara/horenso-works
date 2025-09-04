import { createClient } from "@supabase/supabase-js";

import * as ERR from "../message/error";

/**
 * 共通部分: supabase のクライアント
 */
export const supabaseClient = () => {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) throw new Error(ERR.SUPABASE_KEY_ERROR);
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error(ERR.SUPABASE_URL_ERROR);

  const supabaseClient = createClient(url, supabaseKey);
  return supabaseClient;
};
