import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public by design: the capability grants creation of one server-chosen object,
// not arbitrary bucket writes, reads, updates or deletion.
export const authorizeSubmissionUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    folder: z.enum(["inquiry", "3dp"]),
    filename: z.string().min(1).max(255),
    size: z.number().int().positive().max(50 * 1024 * 1024),
  }).strict().parse(input))
  .handler(async ({ data }) => {
    const extension = data.filename.split(".").pop()?.toLowerCase() ?? "bin";
    if (!/^[a-z0-9]{1,12}$/.test(extension)) throw new Error("Invalid file extension");
    const path = `${data.folder}/${crypto.randomUUID()}.${extension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("submission-files").createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) throw new Error("Could not authorize file upload. Please try again.");
    return { path, token: signed.token };
  });