import { brandedEmailHtml } from "@/lib/email/template.server";
import { sendQuoteDecisionEmail, sendQuoteDeclineEmail } from "@/lib/email/quote-decision.server";
const html = brandedEmailHtml({ preview:"p", kicker:"Quote Ready", headline:"Your quotation is ready.", orderCode:"TR-2026-0012", status:"Quote Sent", intro:"<p>Hello</p>", sections:[{title:"Summary",rows:[{label:"Total",value:"412.50 €"},{label:"Validity",value:"15 days"}]}], outro:"<p>Thanks</p>", cta:{label:"Open your portal",url:"https://www.toreo.gr/track?code=TR-2026-0012"} });
await Bun.write("/tmp/browser/email/render.html", html);
console.log("LINKS", [...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).join(" | "));
console.log("IMGS", [...html.matchAll(/src="([^"]+)"/g)].map(m=>m[1]).join(" | "));
console.log(Object.keys({sendQuoteDecisionEmail, sendQuoteDeclineEmail}).join(","));
