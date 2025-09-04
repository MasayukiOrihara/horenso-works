import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export const MetadataRepo = {
  updateByMetaId: async (id: string, key: string, value: unknown) =>
    dbTry(async () => {
      const { error } = await supabaseClient().rpc(
        "update_metadata_key_by_metaid",
        { meta_id: id, key, value: JSON.stringify(value) }
      );
      if (error) throw new Error(error.message, { cause: error });
      return true;
    }),
};
