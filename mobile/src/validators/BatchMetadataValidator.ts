export type ValidationResult = {
  valid: boolean;
  errors: Partial<Record<'evaluatorName' | 'location' | 'riceVariety', string>>;
};

export function validateBatchMetadata(form: {
  evaluatorName: string;
  location: string;
  riceVariety: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!form.evaluatorName.trim())
    errors.evaluatorName = 'Evaluator name is required';

  if (!form.location.trim())
    errors.location = 'Location is required';

  if (!form.riceVariety.trim())
    errors.riceVariety = 'Rice variety is required';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}