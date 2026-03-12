import { expect, test } from "@playwright/test";

test("registration page renders", async ({ page }) => {
  await page.goto("/account/register");
  await expect(page.getByRole("heading", { name: "Inscription" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.locator("#register-password")).toBeVisible();
});

test("login page exposes recovery flow", async ({ page }) => {
  await page.goto("/account/login");
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mot de passe oublie ?" })).toBeVisible();
});

test("booking page renders the reservation form", async ({ page }) => {
  await page.goto("/booking");
  const emptyState = page.getByRole("heading", { name: "Aucune prestation disponible" });
  const bookingState = page.getByRole("heading", { name: "Choisir un creneau" });

  if (await emptyState.isVisible()) {
    await expect(emptyState).toBeVisible();
    return;
  }

  await expect(bookingState).toBeVisible();
  await expect(page.getByLabel("Nom complet")).toBeVisible();
  await expect(page.getByLabel("Telephone")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmer la reservation" })).toBeVisible();
});
