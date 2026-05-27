/**
 * ValidationService — pure business-logic validation layer.
 * No DB access. No Firebase. Just rules.
 * Used by ImageService and screens to run checklist logic before API calls.
 */

export type ProtocolChecklistItem =
  | 'uvLight'
  | 'whiteTray'
  | 'singleLayer'
  | 'frameAligned';

export interface ProtocolChecklist {
  uvLight: boolean;
  whiteTray: boolean;
  singleLayer: boolean;
  frameAligned: boolean;
}

export interface ChecklistValidationResult {
  passed: boolean;
  failedItems: ProtocolChecklistItem[];
}

/**
 * Validates the protocol positioning checklist.
 * If ANY item fails → Protocol Violation (Layer 1 fail).
 */
export function validateProtocolChecklist(
  checklist: ProtocolChecklist
): ChecklistValidationResult {
  const failedItems: ProtocolChecklistItem[] = [];

  if (!checklist.uvLight) failedItems.push('uvLight');
  if (!checklist.whiteTray) failedItems.push('whiteTray');
  if (!checklist.singleLayer) failedItems.push('singleLayer');
  if (!checklist.frameAligned) failedItems.push('frameAligned');

  return {
    passed: failedItems.length === 0,
    failedItems,
  };
}

/**
 * Maps checklist item keys to human-readable labels for UI display.
 */
export const CHECKLIST_LABELS: Record<ProtocolChecklistItem, string> = {
  uvLight: 'UV light on',
  whiteTray: 'White tray used',
  singleLayer: 'Single layer arrangement',
  frameAligned: 'Frame properly aligned',
};

/**
 * Validates ASV score range.
 */
export function validateASVScore(score: number): boolean {
  return Number.isInteger(score) && score >= 1 && score <= 7;
}

/**
 * Determines if a confirmed score deviates from AI draft — requires remark.
 */
export function requiresDeviationRemark(
  confirmedScore: number,
  aiDraftScore: number
): boolean {
  return confirmedScore !== aiDraftScore;
}