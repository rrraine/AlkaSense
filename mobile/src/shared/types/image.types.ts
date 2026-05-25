export type ValidationStatus =
  | 'ACCEPTED'
  | 'PROTOCOL_VIOLATION'
  | 'QUALITY_FAILURE';

export type GrainImageRecord = {
  id: string;
  sample_id: string;
  image_path: string;
  submission_status: string;
  validation_status: ValidationStatus | null;
  rejection_layer: string | null;
  rejection_reason: string | null;
  validation_timestamp: string | null;
};

export type ImageSubmissionPayload = {
  sample_id: string;
  image_path: string;
};
