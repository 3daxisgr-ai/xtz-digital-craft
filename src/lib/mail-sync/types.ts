// Client-safe report shapes shared by the sync and the admin page.
import type { Classification } from "./mime";

export interface ReportItem {
  folder: "inbox" | "sent";
  uid: number;
  date: string;
  from: string | null;
  to: string | null;
  subject: string;
  classification: Classification | "outgoing";
  action: string;
  reason: string;
  target: { record: string | null; title: string; status: string | null } | null;
  setStatus: string | null;
  ok: boolean;
  error?: string;
}

export interface FolderReport {
  folder: string;
  kind: "inbox" | "sent";
  exists: number;
  uidvalidity: number | null;
  checkpointBefore: number;
  checkpointAfter: number;
  initialized: boolean;
  pending: number;
  taken: number;
}
