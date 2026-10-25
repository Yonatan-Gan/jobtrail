import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Example">
        <input aria-label="First" data-autofocus />
        <Button onClick={() => setOpen(false)}>Last</Button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("moves focus in, keeps Tab inside, closes with Esc and gives focus back", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Open" });

    await user.click(opener);
    expect(screen.getByRole("dialog", { name: "Example" })).toBeInTheDocument();
    expect(screen.getByLabelText("First")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("First")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
