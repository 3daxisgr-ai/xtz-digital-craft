import { defineTool } from "@lovable.dev/mcp-js";

const SERVICES = [
  { slug: "3d-printing", name: "3D Printing", description: "FDM & resin printing on Bambu Lab H2S and High-Detail 0.2 mm printers.", quote_url: "/3d-printing-quote" },
  { slug: "cnc-machining", name: "CNC Machining", description: "Milling and turning of metals and engineering plastics.", quote_url: "/start-project" },
  { slug: "rapid-prototyping", name: "Rapid Prototyping", description: "Fast-turnaround prototypes across 3D printing, CNC and sheet metal.", quote_url: "/start-project" },
  { slug: "custom-metal-parts", name: "Custom Metal Parts", description: "Laser cutting, press-brake bending and welding for custom metal parts.", quote_url: "/start-project" },
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
