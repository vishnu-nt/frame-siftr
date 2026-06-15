import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Frame Siftr landing page", async () => {
  render(<App />);
  const elements = await screen.findAllByText(/Frame Siftr/i);
  expect(elements.length).toBeGreaterThan(0);
});
