import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { DenseInput } from "@/components/heritage/dense-input";

describe("DenseInput", () => {
  test("renders with hz-input class", () => {
    render(<DenseInput aria-label="client" defaultValue="bar du po" />);
    const input = screen.getByLabelText("client");
    expect(input.className).toContain("hz-input");
  });

  test("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DenseInput aria-label="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test("merges extra className", () => {
    render(<DenseInput aria-label="y" className="extra" />);
    expect(screen.getByLabelText("y").className).toContain("extra");
  });
});
