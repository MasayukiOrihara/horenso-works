import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export const GenericRepo = {
  fetchAll: async <T = any>(tableName: string) =>
    dbTry<T[]>(async () => {
      const { data, error } = await supabaseClient()
        .from(tableName)
        .select("*");
      if (error) throw new Error(error.message, { cause: error });
      return data ?? [];
    }),
  callDeleteOldCluelist: async () =>
    dbTry(async () => {
      const { error } = await supabaseClient().rpc("delete_old_cluelist");
      if (error) throw new Error(error.message, { cause: error });
      return true;
    }),
};
