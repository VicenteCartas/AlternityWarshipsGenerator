import { useCallback, useEffect, useRef, useState } from 'react';

/** Manages hidden-scrollbar navigation and active-step visibility for horizontal steppers. */
export function useHorizontalStepperScroll(activeStep: number, layoutKey: string) {
  const stepperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const element = stepperRef.current;
    if (!element) return;
    setCanScrollLeft(element.scrollLeft > 0);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollArrows();
    window.addEventListener('resize', updateScrollArrows);
    return () => window.removeEventListener('resize', updateScrollArrows);
  }, [updateScrollArrows]);

  useEffect(() => {
    const timer = window.setTimeout(updateScrollArrows, 50);
    return () => window.clearTimeout(timer);
  }, [layoutKey, updateScrollArrows]);

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