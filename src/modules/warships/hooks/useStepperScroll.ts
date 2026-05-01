import { useState, useCallback, useRef, useEffect } from 'react';
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
  const stepperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = stepperRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollArrows();
    window.addEventListener('resize', updateScrollArrows);
    return () => window.removeEventListener('resize', updateScrollArrows);
  }, [updateScrollArrows]);

  // Re-check stepper scroll arrows when steps change (design type switch)
  useEffect(() => {
    const timer = setTimeout(updateScrollArrows, 50);
    return () => clearTimeout(timer);
  }, [designType, stationType, updateScrollArrows]);

  // Auto-scroll the active step into view within the stepper
  useEffect(() => {
    const container = stepperRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll('.MuiStepButton-root');
    const activeButton = buttons[activeStep] as HTMLElement | undefined;
    if (!activeButton) return;
    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    if (buttonRect.left < containerRect.left) {
      container.scrollBy({ left: buttonRect.left - containerRect.left - 16, behavior: 'smooth' });
    } else if (buttonRect.right > containerRect.right) {
      container.scrollBy({ left: buttonRect.right - containerRect.right + 16, behavior: 'smooth' });
    }
  }, [activeStep]);

  return { stepperRef, canScrollLeft, canScrollRight, updateScrollArrows };
}
