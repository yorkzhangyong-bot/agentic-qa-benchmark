import { test as base } from '@playwright/test';

export interface Cleanup {
  add(task: () => Promise<void>): void;
}

/**
 * Per-test cleanup registry. Tasks are added right after the data is created and drained after the
 * test, even when an assertion fails, so a failing test never leaves data behind for the next one.
 */
export const test = base.extend<{ cleanup: Cleanup }>({
  cleanup: async ({}, use) => {
    const tasks: Array<() => Promise<void>> = [];
    await use({ add: task => tasks.push(task) });
    for (const task of tasks.splice(0).reverse()) {
      await task();
    }
  },
});

export { expect } from '@playwright/test';
