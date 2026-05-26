// FR-M1-04: Validates batch-level treatment fields for acceptable numeric ranges.
// Called from CreateSessionScreen before session record is written.

export type BatchMetadataFields = {
  kohConcentration: string;
  incubationDuration: string;
  incubationTemperature: string;
};

export type BatchMetadataErrors = Partial<
  Record<'kohConcentration' | 'incubationDuration' | 'incubationTemperature', string>
>;

export function validateBatchMetadata(fields: BatchMetadataFields): BatchMetadataErrors {
  const errors: BatchMetadataErrors = {};

  const koh = parseFloat(fields.kohConcentration);
  if (isNaN(koh)) {
    errors.kohConcentration = 'KOH concentration must be a valid number.';
  } else if (koh < 0.1 || koh > 20) {
    errors.kohConcentration = 'KOH concentration must be between 0.1% and 20%.';
  }

  const dur = parseFloat(fields.incubationDuration);
  if (isNaN(dur)) {
    errors.incubationDuration = 'Incubation duration must be a valid number.';
  } else if (dur < 1 || dur > 72) {
    errors.incubationDuration = 'Incubation duration must be between 1 and 72 hours.';
  }

  const temp = parseFloat(fields.incubationTemperature);
  if (isNaN(temp)) {
    errors.incubationTemperature = 'Incubation temperature must be a valid number.';
  } else if (temp < 15 || temp > 45) {
    errors.incubationTemperature = 'Incubation temperature must be between 15°C and 45°C.';
  }

  return errors;
}
