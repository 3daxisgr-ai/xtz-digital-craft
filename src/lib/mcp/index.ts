import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listServicesTool from "./tools/list-services";
import listPrintingMaterialsTool from "./tools/list-printing-materials";
import trackOrderTool from "./tools/track-order";

// Must be the direct Supabase host: the .lovable.cloud proxy fails RFC 8414 issuer matching.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "toreo",
  title: "TOREO AI Factory",
  version: "0.2.0",
  instructions:
    "Tools for TOREO's on-demand manufacturing platform. Callers sign in as a TOREO customer. Use `list_services` to enumerate offered services, `list_printing_materials` to see 3D printing materials in stock, and `track_order` to look up the status of one of the signed-in customer's own orders.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listServicesTool, listPrintingMaterialsTool, trackOrderTool],
});
