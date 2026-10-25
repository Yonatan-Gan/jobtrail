// Runs before every test file (see vite.config.ts).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom has no <dialog> methods yet (real browsers do). This is just enough for the
// tests: showModal()/close() toggle the `open` attribute, and Esc fires "cancel" the way
// a browser does for an open modal dialog.
// (Partial: TypeScript's DOM types say these methods always exist, which isn't true here.)
const dialogPrototype: Partial<HTMLDialogElement> = HTMLDialogElement.prototype;
if (!dialogPrototype.showModal) {
  if (!("open" in dialogPrototype)) {
    Object.defineProperty(dialogPrototype, "open", {
      get(this: HTMLDialogElement) {
        return this.hasAttribute("open");
      },
    });
  }
  dialogPrototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  dialogPrototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document
        .querySelector("dialog[open]")
        ?.dispatchEvent(new Event("cancel", { cancelable: true }));
    }
  });
}

beforeEach(() => {
  // Tests mock the API client. A real request means a test forgot to mock something.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Unexpected fetch in a test")),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
