import { defineMcp } from "@lovable.dev/mcp-js";
import listServicesTool from "./tools/list-services";
import listPrintingMaterialsTool from "./tools/list-printing-materials";
import trackOrderTool from "./tools/track-order";

export default defineMcp({
  name: "toreo-mcp",
  title: "TOREO AI Factory",
  version: "0.1.0",
  instructions:
    "Tools for TOREO's on-demand manufacturing platform. Use `list_services` to enumerate offered services, `list_printing_materials` to see 3D printing materials in stock, and `track_order` to look up the status of an existing order (requires order code + customer email).",
  tools: [listServicesTool, listPrintingMaterialsTool, trackOrderTool],
});
