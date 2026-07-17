import { defineTool } from "@lovable.dev/mcp-js";

const SERVICES = [
  { slug: "3d-printing", name: "3D Printing", description: "FDM 3D printing on Bambu Lab H2S printers for prototypes and functional parts.", quote_url: "/3d-printing-quote" },
  { slug: "fiber-laser-cutting", name: "Fiber Laser Cutting", description: "Precision cutting of steel, stainless and aluminium sheet metal.", quote_url: "/start-project" },
  { slug: "sheet-metal-fabrication", name: "Sheet Metal Bending & Welding", description: "Press-brake bending, MIG and TIG welding and assembly of custom metal parts.", quote_url: "/start-project" },
  { slug: "cad-design-prototyping", name: "CAD Design & Prototyping", description: "CAD design and prototyping support from concept through manufacturable files.", quote_url: "/start-project" },
];

export default defineTool({
  name: "list_services",
  title: "List TOREO services",
  description: "List the manufacturing services TOREO offers, with a short description and where the customer can request a quote.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(SERVICES, null, 2) }],
    structuredContent: { services: SERVICES },
  }),
});
