import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_my_profile",
  title: "Update my profile",
  description: "Update the signed-in user's ID•SPACE FINANCE profile username and/or avatar URL.",
  inputSchema: {
    username: z.string().trim().optional().describe("New username (3-32 characters)."),
    avatar: z.string().url().nullable().optional().describe("New avatar image URL, or null to clear it."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ username, avatar }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (username === undefined && avatar === undefined) {
      throw new ToolError("Provide at least one of `username` or `avatar`.");
    }
    if (username !== undefined && (username.length < 3 || username.length > 32)) {
      throw new ToolError("`username` must be between 3 and 32 characters.");
    }

    const patch: Record<string, unknown> = {};
    if (username !== undefined) patch.username = username;
    if (avatar !== undefined) patch.avatar = avatar;

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.getUserId())
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { profile: data ?? null },
    };
  },
});
