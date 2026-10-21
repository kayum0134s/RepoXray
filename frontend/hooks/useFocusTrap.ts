'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Remember the last element focused outside a dialog. When a dialog is opened
// programmatically the browser may report <body> as the active element, so this
// gives the trap a reliable element to restore focus to on close.
let lastFocusedOutsideDialog: HTMLElement | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === document.body) return;
      if (target.closest('[role="dialog"]')) return;
      lastFocusedOutsideDialog = target;
    },
    true
  );

  // Pointer activation is the common way dialogs open, and is more reliable
  // than focusin when the browser has not focused the trigger yet.
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest<HTMLElement>('button, a[href], [role="button"]');
      if (trigger && !trigger.closest('[role="dialog"]')) {
        lastFocusedOutsideDialog = trigger;
      }
    },
    true
  );
}

/**
 * Traps keyboard focus inside `containerRef` while `active`, focuses the first
 * interactive element on open, and restores the previously focused element on close.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, containerRef: RefObject<T>) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = document.activeElement as HTMLElement | null;
    previousFocus.current =
      activeElement && activeElement !== document.body ? activeElement : lastFocusedOutsideDialog;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    const initial = getFocusable();
    (initial[0] ?? container).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && (activeEl === first || activeEl === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);

      // Defer restoration until React has finished removing the dialog; focusing
      // synchronously can be undone by the browser when the focused node is detached.
      const target = previousFocus.current;
      const restore = () => {
        if (target?.isConnected) target.focus({ preventScroll: true });
      };

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(restore);
      } else {
        setTimeout(restore, 0);
      }
    };
  }, [active, containerRef]);
}
