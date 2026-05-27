import { apiClient } from '../client';
import { ExportGenerationResult } from '../../shared/types/report.types';

type ReportUploadInput = ExportGenerationResult & { session_id: string };

export type UploadReceipt = {
  server_id: string;
  received_at: string;
};

export async function uploadReport(input: ReportUploadInput): Promise<UploadReceipt> {
  const form = new FormData();
  form.append('session_id', input.session_id);
  form.append('generated_at', input.generated_at);
  form.append('pdf', {
    uri: input.pdf_path,
    type: 'application/pdf',
    name: 'report.pdf',
  } as unknown as Blob);
  form.append('csv', {
    uri: input.csv_path,
    type: 'text/csv',
    name: 'report.csv',
  } as unknown as Blob);

  // React Native XHR requires Content-Type: multipart/form-data (without boundary).
  // The native XHR layer appends the correct "; boundary=XXX" string automatically
  // when it detects a FormData body.  Omitting this header lets the axios instance
  // default (application/json) win → FastAPI receives wrong Content-Type → 422.
  const { data } = await apiClient.post<UploadReceipt>('/reports/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
