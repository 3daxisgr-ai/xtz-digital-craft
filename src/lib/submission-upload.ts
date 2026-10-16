import { supabase } from "@/integrations/supabase/client";
import { authorizeSubmissionUpload } from "@/lib/api/submission-upload.functions";

export async function uploadSubmissionFile(file: File, folder: "inquiry" | "3dp") {
  const grant = await authorizeSubmissionUpload({ data: { folder, filename: file.name, size: file.size } });
  const { error } = await supabase.storage.from("submission-files")
    .uploadToSignedUrl(grant.path, grant.token, file, {
      upsert: false, contentType: file.type || "application/octet-stream",
    });
  if (error) throw new Error("Could not upload file. Please try again.");
  return grant.path;
}