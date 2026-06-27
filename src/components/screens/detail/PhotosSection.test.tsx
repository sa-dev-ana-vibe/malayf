import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeVisit } from "../../../test/factories";
import { PhotosSection } from "./PhotosSection";

vi.mock("../../../ui/usePhotoUrl", () => ({
  usePhotoUrl: (id: string | null | undefined) => (id ? `blob:${id}` : null),
}));

describe("PhotosSection", () => {
  it("pages the open photo with arrow buttons and keyboard arrows", async () => {
    const user = userEvent.setup();
    const av = makeVisit({ name: "Flat", photos: ["photo-a", "photo-b", "photo-c"] });
    const photoOrder = av.photos.map((src, i) => ({ src, i }));

    render(<PhotosSection av={av} photoOrder={photoOrder} />);

    await user.click(screen.getAllByRole("button", { name: "Открыть фото целиком: Flat" })[0]);
    expect(screen.getByAltText("Flat photo full size")).toHaveAttribute("src", "blob:photo-a");

    await user.click(screen.getByRole("button", { name: "Следующее фото" }));
    expect(screen.getByAltText("Flat photo full size")).toHaveAttribute("src", "blob:photo-b");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByAltText("Flat photo full size")).toHaveAttribute("src", "blob:photo-a");

    await user.click(screen.getByRole("button", { name: "Предыдущее фото" }));
    expect(screen.getByAltText("Flat photo full size")).toHaveAttribute("src", "blob:photo-c");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByAltText("Flat photo full size")).toHaveAttribute("src", "blob:photo-a");
  });

  it("keeps focus inside the lightbox and restores it on close", async () => {
    const user = userEvent.setup();
    const av = makeVisit({ name: "Flat", photos: ["photo-a", "photo-b"] });
    const photoOrder = av.photos.map((src, i) => ({ src, i }));

    render(<PhotosSection av={av} photoOrder={photoOrder} />);

    const opener = screen.getAllByRole("button", { name: "Открыть фото целиком: Flat" })[0];
    await user.click(opener);

    const closeButton = screen.getByRole("button", { name: "Закрыть просмотр фото" });
    const prevButton = screen.getByRole("button", { name: "Предыдущее фото" });
    const nextButton = screen.getByRole("button", { name: "Следующее фото" });
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(prevButton).toHaveFocus();
    await user.tab();
    expect(nextButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(nextButton).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });

  it("does not show paging buttons for a single open photo", async () => {
    const user = userEvent.setup();
    const av = makeVisit({ name: "Flat", photos: ["photo-a"] });
    const photoOrder = av.photos.map((src, i) => ({ src, i }));

    render(<PhotosSection av={av} photoOrder={photoOrder} />);

    await user.click(screen.getByRole("button", { name: "Открыть фото целиком: Flat" }));

    expect(screen.queryByRole("button", { name: "Предыдущее фото" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Следующее фото" })).not.toBeInTheDocument();
  });
});
