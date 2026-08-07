import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimDueReminders: vi.fn(),
  cleanupReminders: vi.fn(),
  cleanupCorrections: vi.fn(),
  cleanupProcessedUpdates: vi.fn(),
  markReminderSent: vi.fn(),
  markReminderRetry: vi.fn(),
  markReminderFailed: vi.fn(),
  sendMessage: vi.fn()
}));

vi.mock("../src/repositories/reminders", () => ({
  claimDueReminders: mocks.claimDueReminders,
  cleanupReminders: mocks.cleanupReminders,
  markReminderSent: mocks.markReminderSent,
  markReminderRetry: mocks.markReminderRetry,
  markReminderFailed: mocks.markReminderFailed
}));
vi.mock("../src/repositories/corrections", () => ({
  cleanupCorrections: mocks.cleanupCorrections
}));
vi.mock("../src/repositories/updates", () => ({
  cleanupProcessedUpdates: mocks.cleanupProcessedUpdates
}));
vi.mock("../src/services/telegram", async () => {
  const actual = await vi.importActual<typeof import("../src/services/telegram")>("../src/services/telegram");
  return { ...actual, sendMessage: mocks.sendMessage };
});

import { sendDueReminders } from "../src/handlers";

describe("daily cleanup scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimDueReminders.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("runs cleanup during the 02:00 UTC hour even if the trigger lands past :05", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 7, 2, 37, 12)));
    await sendDueReminders({} as never);
    expect(mocks.cleanupReminders).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupCorrections).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupProcessedUpdates).toHaveBeenCalledTimes(1);
  });

  it("does not run cleanup outside the 02:00 UTC hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 7, 3, 0, 0)));
    await sendDueReminders({} as never);
    expect(mocks.cleanupReminders).not.toHaveBeenCalled();
    expect(mocks.cleanupCorrections).not.toHaveBeenCalled();
    expect(mocks.cleanupProcessedUpdates).not.toHaveBeenCalled();
  });
});
