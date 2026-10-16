import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_printing_materials",
  title: "List 3D printing materials",
  description: "List the 3D printing material families currently offered by TOREO with in-stock status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("materials")
      .select("code, name, family, stock_kg")
      .eq("active", true)
      .eq("process", "3d_printing")
      .order("family");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = (data ?? []).map((m: any) => ({
      code: m.code, name: m.name, family: m.family, in_stock: Number(m.stock_kg ?? 0) > 0,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { materials: rows },
    };
  },
});
