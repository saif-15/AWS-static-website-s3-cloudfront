import { expect, test } from "@playwright/test";

test("map loads, search flies to a city, bookmark appears in the dock", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "World Clock" })).toBeVisible();

  // Live clock for the user's own zone replaces the skeleton after mount.
  await expect(page.getByRole("timer", { name: /Your local time: \d/ }).first()).toBeVisible();

  // Map renders with land and city markers.
  const map = page.getByRole("application", { name: /Interactive world map/ });
  await expect(map).toBeVisible();
  await expect(page.locator("g[data-city='tokyo']")).toBeAttached();

  // Ctrl+K search → Karachi → panel opens.
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: /Search cities/ });
  await expect(search).toBeFocused();
  await search.fill("karachi");
  await expect(page.getByRole("option", { name: /Karachi/ }).first()).toBeVisible();
  await search.press("Enter");

  const panel = page.locator("aside[aria-labelledby='panel-title']");
  await expect(panel.getByRole("heading", { name: "Karachi" })).toBeVisible();
  await expect(panel.getByText("UTC+5")).toBeVisible();

  // Bookmark it; the dock shows a live card; Escape closes the panel.
  await panel.getByRole("button", { name: "Add Karachi to My Clocks" }).first().click();
  await expect(page.getByRole("region", { name: "My Clocks" }).getByText("Karachi")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // Bookmark persisted across reload (validated rehydration).
  await page.reload();
  await expect(page.getByRole("region", { name: "My Clocks" }).getByText("Karachi")).toBeVisible();

  // A static city page works through the CloudFront-style rewrite.
  await page.goto("/city/kathmandu");
  await expect(page.getByRole("heading", { name: "Time in Kathmandu" })).toBeVisible();
  await expect(page.getByText("UTC+5:45")).toBeVisible();

  expect(errors).toEqual([]);
});
