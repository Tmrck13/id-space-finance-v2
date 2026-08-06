import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_transactions",
  title: "List my transactions",
  description:
    "List the signed-in user's ledger transactions (most recent first). Optionally filter by currency or status.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many entries to return (default 20, max 100)."),
    currency: z.enum(["pi", "idpoints", "cashback"]).optional().describe("Filter by currency."),
    status: z.enum(["pending", "success", "cancelled", "failed"]).optional().describe("Filter by status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, currency, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const take = Math.min(Math.max(limit ?? 20, 1), 100);

    const wallet = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (wallet.error) return { content: [{ type: "text", text: wallet.error.message }], isError: true };
    if (!wallet.data) {
      return { content: [{ type: "text", text: "No wallet found for this account." }], isError: true };
    }

    let query = supabase
      .from("ledger")
      .select("*")
      .eq("wallet_id", wallet.data.id)
      .order("created_at", { ascending: false })
      .limit(take);
    if (currency) query = query.eq("currency", currency);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
