import { sendStatusEmail } from "@/lib/email/order-notify.server";
const order = { order_code: "TR-2026-0012", customer_email: "info@toreo.gr", quote_price: 412.5, courier: "ACS", tracking_number: "ACS123456789", tracking_url: "https://www.acscourier.net/track", estimated_delivery: "2026-08-08" };
for (const s of ["quote_sent","production","shipped","delivered"]) {
  try { await sendStatusEmail(order, s); console.log("STATUS_OK", s); }
  catch (e) { console.log("STATUS_FAIL", s, String(e)); }
}
