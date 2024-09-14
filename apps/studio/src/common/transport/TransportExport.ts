import { ExportStatus } from "@/lib/export/models";

export interface TransportExport {
  id: string,
  status: ExportStatus,
  filePath: string,
  percentComplete: number
}
