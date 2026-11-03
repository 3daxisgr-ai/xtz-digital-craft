import { describe, expect, it } from "vitest";
import { parseMessage, htmlToText } from "./message";
import { SmtpReplyReader, parseEhlo, assertAllowedSmtp } from "./smtp";

const enc = (s: string) => new TextEncoder().encode(s);

describe("parseMessage", () => {
  it("reads multipart text, Greek subject and attachment metadata", () => {
    const raw = [
      "From: =?UTF-8?B?zpPOuc+Oz4HOs86/z4I=?= <g@example.gr>",
      "To: info@toreo.gr",
      "Subject: =?UTF-8?Q?=CE=A0=CF=81=CE=BF=CF=83=CF=86=CE=BF=CF=81=CE=AC?=",
      "Message-ID: <a1@example.gr>",
      'Content-Type: multipart/mixed; boundary="B"',
      "",
      "--B",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "=CE=93=CE=B5=CE=B9=CE=B1 sas",
      "--B",
      'Content-Type: application/pdf; name="drawing.pdf"',
      "Content-Disposition: attachment; filename=\"drawing.pdf\"",
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQ=",
      "--B--",
    ].join("\r\n");
    const m = parseMessage(enc(raw));
    expect(m.subject).toBe("Προσφορά");
    expect(m.from[0].email).toBe("g@example.gr");
    expect(m.text).toBe("Γεια sas");
    expect(m.textSource).toBe("plain");
    expect(m.attachments).toEqual([{ filename: "drawing.pdf", contentType: "application/pdf", bytes: 8 }]);
    expect(m.messageId).toBe("<a1@example.gr>");
  });

  it("falls back to HTML as plain text, never markup", () => {
    const raw = "Subject: x\r\nContent-Type: text/html\r\n\r\n<p>Hi<br>there &amp; you</p><script>x()</script>";
    const m = parseMessage(enc(raw));
    expect(m.textSource).toBe("html");
    expect(m.text).toBe("Hi\nthere & you");
    expect(htmlToText("<b>a</b>")).toBe("a");
  });

  it("marks truncated input instead of inventing content", () => {
    const m = parseMessage(enc("Subject: x\r\n\r\nhello"), { truncated: true });
    expect(m.truncated).toBe(true);
    expect(m.text).toBe("hello");
  });
});

describe("smtp", () => {
  it("parses multi-line EHLO capabilities", () => {
    const r = new SmtpReplyReader();
    const out = r.push(enc("250-mail.example Hello\r\n250-SIZE 52428800\r\n250-AUTH PLAIN LOGIN\r\n250 SMTPUTF8\r\n"));
    expect(out).toHaveLength(1);
    const e = parseEhlo(out[0]);
    expect(e.auth).toEqual(["PLAIN", "LOGIN"]);
    expect(e.maxSize).toBe(52428800);
    expect(e.smtpUtf8).toBe(true);
  });

  it("refuses any command that could send mail", () => {
    for (const c of ["MAIL FROM:<a@b.c>", "RCPT TO:<a@b.c>", "DATA"]) expect(() => assertAllowedSmtp(c)).toThrow();
    expect(() => assertAllowedSmtp("EHLO toreo.gr")).not.toThrow();
  });
});
