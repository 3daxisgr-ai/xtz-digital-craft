import { sendBrandedEmail } from "@/lib/email/template.server";
const bytes = new Uint8Array(await Bun.file("/tmp/quote.pdf").arrayBuffer());
let bin=""; const c=0x8000;
for (let i=0;i<bytes.length;i+=c) bin += String.fromCharCode(...bytes.subarray(i,i+c));
const r = await sendBrandedEmail({
  to: "info@toreo.gr", replyTo: "INFO@TOREO.GR",
  subject: "Προσφορά TR-9999 (audit test)",
  attachments: [{ filename: "TR-9999.pdf", content: btoa(bin) }],
  params: { kicker:"ΠΡΟΣΦΟΡΑ", headline:"Προσφορά TR-9999", orderCode:"TR-2026-0012",
    intro:"<p style='margin:0'>Δοκιμή συνημμένου PDF.</p>",
    sections:[{title:"Σύνοψη",rows:[{label:"Συνολικό ποσό",value:"511.50 €"},{label:"Ισχύς",value:"15 ημέρες"}]}],
    cta:{label:"Portal",url:"https://www.toreo.gr/track?code=TR-2026-0012"} },
});
console.log("ATTACH_SEND", JSON.stringify(r));
