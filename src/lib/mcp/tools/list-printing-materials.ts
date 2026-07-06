import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "list_printing_materials",
  title: "List 3D printing materials",
  description: "List the 3D printing material families currently offered by TOREO with in-stock status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
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
