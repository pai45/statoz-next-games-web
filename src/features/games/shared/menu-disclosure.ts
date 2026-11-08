import type { KeyboardEvent } from 'react';

/** Escape closes the innermost menu disclosure before a game's Back/Resume shortcut. */
export function closeMenuDisclosure(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Escape') return;
  const open = Array.from(event.currentTarget.querySelectorAll<HTMLDetailsElement>('details[open]')).at(-1);
  if (!open) return;
  event.preventDefault();
  event.stopPropagation();
  open.open = false;
  open.querySelector('summary')?.focus();
}
