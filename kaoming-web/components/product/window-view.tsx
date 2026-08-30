'use client';

import { createContext, use } from 'react';

export type WindowView = 'web' | 'viewer' | 'spec' | 'gallery';

/**
 * Which pane of the machine window is open, and how to change it.
 *
 * The panes are rendered on the server and handed to `MachineWindow` as
 * elements, so a control inside one of them cannot be passed a callback — a
 * function does not cross that boundary. Context does: every pane is a client
 * component once it is in the tree, and the window is a client ancestor.
 *
 * Nullable on purpose. `useWindowView` returns null outside a window rather than
 * throwing, so the constellation and the rest can also be rendered on an
 * ordinary page — and each falls back to a plain link when there is no pane to
 * switch to.
 */
export const WindowViewContext = createContext<{
  view: WindowView;
  setView: (view: WindowView) => void;
} | null>(null);

export function useWindowView() {
  return use(WindowViewContext);
}
