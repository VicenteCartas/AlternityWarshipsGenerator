import { useHorizontalStepperScroll } from '@shared/hooks/useHorizontalStepperScroll';
import type { DesignType, StationType } from '../types/common';

/**
 * Manages horizontal stepper scroll state: scroll arrows, resize tracking,
 * and auto-scrolling the active step into view.
 */
export function useStepperScroll(
  activeStep: number,
  designType: DesignType,
  stationType: StationType | null,
) {
  return useHorizontalStepperScroll(activeStep, `${designType}:${stationType || ''}`);
}
