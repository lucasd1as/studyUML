import { expect, test } from "@playwright/test";

/**
 * The whole Phase 0 loop: Continue → 5 questions → XP after every answer (wrong ones included) →
 * combo resets on a miss → summary totals match → Continue starts a different session.
 */
test("question → answer → XP → level bar loop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("level")).toHaveText("1");
  await expect(page.getByTestId("continue-title")).toHaveText("The Problem with Ownership");
  await page.getByTestId("continue").click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const firstSessionUrl = page.url();
  await expect(page.getByTestId("progress-counter")).toHaveText("1 of 5");

  const deltas: number[] = [];
  let sawWrong = false;
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId("progress-counter")).toHaveText(`${i + 1} of 5`);
    // The previous question is still animating out; target this position explicitly.
    const question = page.locator(`[data-testid="question"][data-position="${i}"]`);
    await expect(question).toBeVisible();
    const type = await question.getAttribute("data-question-type");
    if (type === "fill_blank") {
      await page.getByTestId("blank-input").fill("nope");
      await page.getByTestId("blank-submit").click();
    } else {
      await question.locator('[data-testid^="option-"]').first().click();
    }

    const feedback = page.getByTestId("feedback");
    await expect(feedback).toBeVisible();
    const delta = await page.getByTestId("xp-delta").innerText();
    const amount = Number(/\+(\d+) XP/.exec(delta)?.[1]);
    expect(amount).toBeGreaterThan(0);
    deltas.push(amount);

    if ((await feedback.getAttribute("data-correct")) === "false") {
      sawWrong = true;
      await expect(page.getByTestId("combo")).toHaveAttribute("data-combo", "0");
    }
    await expect(page.getByTestId("level-hint")).not.toHaveText("");
    await page.getByTestId("next").click();
    await expect(feedback).toBeHidden();
  }

  expect(sawWrong).toBe(true);
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByTestId("session-summary")).toBeVisible();
  const earned = deltas.reduce((a, b) => a + b, 0);
  await expect(page.getByTestId("summary-xp")).toHaveText(`+${earned}`);
  await expect(page.getByTestId("summary-correct")).toContainText("/ 5");

  await page.getByTestId("continue").click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  expect(page.url()).not.toBe(firstSessionUrl);
  await expect(page.getByTestId("progress-counter")).toHaveText("1 of 5");
});

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toMatchObject({ ok: true });
});
