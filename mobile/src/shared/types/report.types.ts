export type UploadStatus = 'NOT_UPLOADED' | 'UPLOADED' | 'FAILED';

export type SessionReportRecord = {
  id: string;
  session_id: string;
  pdf_path?: string;   // retained for DB column compat; empty string on new exports
  csv_path: string;
  generated_at: string;
  upload_status: UploadStatus;
  upload_attempts: number;
  last_attempted_at: string | null;
};

export type ExportGenerationResult = {
  csv_path: string;
  generated_at: string;
};
