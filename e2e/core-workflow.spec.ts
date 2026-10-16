import {
  test as base,
  expect,
  chromium,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";

interface Workspace {
  tempDir: string;
  contexts: BrowserContext[];
  traces: string[];
  browserErrors: string[];
  page?: Page;
}

const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({}, use, testInfo) => {
    const workspace: Workspace = {
      tempDir: await mkdtemp(path.join(tmpdir(), "frame-siftr-e2e-")),
      contexts: [],
      traces: [],
      browserErrors: [],
    };
    try {
      await use(workspace);
    } finally {
      // Fixture teardown gets its own time budget, including when the test times out.
      const failed = testInfo.status !== testInfo.expectedStatus;
      try {
        if (failed) {
          await testInfo.attach("browser errors", {
            body: workspace.browserErrors.join("\n"),
            contentType: "text/plain",
          });
          if (workspace.page && !workspace.page.isClosed()) {
            await testInfo.attach("failure screenshot", {
              body: await workspace.page.screenshot({
                fullPage: true,
                timeout: 5_000,
              }),
              contentType: "image/png",
            });
          }
        }
      } finally {
        try {
          const context = workspace.contexts.at(-1);
          if (context?.pages().length) {
            const tracePath = testInfo.outputPath("final-trace.zip");
            await context.tracing.stop({ path: tracePath });
            workspace.traces.push(tracePath);
          }
        } finally {
          await Promise.all(
            workspace.contexts.map((context) => context.close()),
          );
          await rm(workspace.tempDir, { recursive: true, force: true });
          for (const tracePath of workspace.traces) {
            if (failed) {
              await testInfo.attach(path.basename(tracePath), {
                path: tracePath,
                contentType: "application/zip",
              });
            } else {
              await rm(tracePath, { force: true });
            }
          }
        }
      }
    }
  },
});

test("label images, export by label, and restore assignments after browser relaunch", async ({
  workspace,
}, testInfo) => {
  const { tempDir, contexts, traces, browserErrors } = workspace;
  const uploadDir = path.join(tempDir, "photos");
  const labeledFile = path.join(uploadDir, "nested", "test-image-2.png");

  // Persistent contexts are test-owned: trace/screenshot handling must be explicit.
  async function launch() {
    const context = await chromium.launchPersistentContext(
      path.join(tempDir, "profile"),
      {
        ...testInfo.project.use.launchOptions,
        headless: testInfo.project.use.headless ?? true,
        baseURL: testInfo.project.use.baseURL,
        viewport: { width: 1440, height: 1000 },
        acceptDownloads: true,
      },
    );
    contexts.push(context);
    context.setDefaultTimeout(10_000);
    context.setDefaultNavigationTimeout(15_000);
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    const page = context.pages()[0] || (await context.newPage());
    workspace.page = page;
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    // ZIP export shows a completion alert after triggering the download.
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "alert") await dialog.accept();
      else await dialog.dismiss();
    });
    await page.goto("/");
    // The dashboard renders before async IndexedDB initialization completes.
    // Wait for its existing completion log; do not seed or replace real storage.
    await Promise.all([
      page.waitForEvent("console", {
        predicate: (message) =>
          message.text().startsWith("No active project loaded.") ||
          message.text().startsWith("Auto-loaded last active project:"),
      }),
      page.getByRole("button", { name: "Launch Culling Workspace" }).click(),
    ]);
    return page;
  }

  async function stopTracing(context: BrowserContext, phase: string) {
    const tracePath = testInfo.outputPath(`${phase}-trace.zip`);
    await context.tracing.stop({ path: tracePath });
    traces.push(tracePath);
  }

  async function download(page: Page, menuItem: string, filename: string) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Export", exact: true })
      .click();
    const [result] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: menuItem, exact: true }).click(),
    ]);
    expect(path.extname(result.suggestedFilename())).toBe(
      path.extname(filename),
    );
    const destination = testInfo.outputPath(filename);
    await result.saveAs(destination);
    return readFile(destination);
  }

  async function verifyZip(page: Page, filename: string) {
    const archive = unzipSync(await download(page, "Export as ZIP", filename));
    expect(Object.keys(archive)).toEqual(["Keep/test-image-2.png"]);
    expect([...archive["Keep/test-image-2.png"]]).toEqual([
      ...(await readFile(labeledFile)),
    ]);
  }

  async function verifyAssignment(page: Page) {
    await expect(
      page.getByRole("navigation").getByText("1 / 2", { exact: true }),
    ).toBeVisible();
    const image = page
      .getByRole("main")
      .getByRole("img", { name: "test-image-2.png", exact: true });
    await expect(image).toBeVisible();
    // The thumbnail's green check and disabled label menu prove this image is assigned.
    const thumbnail = image.locator("..").locator("..");
    await expect(thumbnail.locator("svg.lucide-check")).toBeVisible();
    await image.click({ button: "right" });
    await expect(
      page.getByRole("button", { name: "Keep", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }

  await mkdir(path.dirname(labeledFile), { recursive: true });
  await copyFile(
    path.resolve("public/test-image-1.png"),
    path.join(uploadDir, "test-image-1.png"),
  );
  await copyFile(path.resolve("public/test-image-2.png"), labeledFile);
  const fileInfo = await stat(labeledFile);

  let page = await launch();
  await page.getByPlaceholder("e.g. Vacation Photos").fill("Core workflow");
  await page
    .getByRole("button", { name: "Create & Open", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Upload Folder", exact: true }),
  ).toBeVisible();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload Folder", exact: true }).click(),
  ]);
  await chooser.setFiles(uploadDir);
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(2);
  await expect(
    page.getByRole("navigation").getByText("0 / 2", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("img", { name: "test-image-2.png", exact: true })
    .click();
  await page.getByRole("button", { name: "+ New", exact: true }).click();
  await page.getByPlaceholder("Enter label name").fill("Keep");
  await page.getByRole("button", { name: "Create Label", exact: true }).click();
  await page.getByRole("button", { name: /^Keep 0 images 1$/ }).click();
  await page.keyboard.press("Escape");
  await verifyAssignment(page);
  await verifyZip(page, "before-relaunch.zip");

  const exported = JSON.parse(
    (await download(page, "Export JSON", "assignments.json")).toString(),
  );
  expect(exported.formatVersion).toBe(2);
  expect(exported.uploadRoot).toBe("photos");
  expect(exported.labels).toEqual([
    { id: expect.any(String), name: "Keep", color: "#3b82f6" },
  ]);
  expect(exported.assignments).toEqual([
    {
      relativePath: "nested/test-image-2.png",
      filename: "test-image-2.png",
      size: fileInfo.size,
      lastModified: Math.trunc(fileInfo.mtimeMs),
      label: "Keep",
      labelId: exported.labels[0].id,
    },
  ]);
  expect(exported.summary).toEqual({
    totalImages: 2,
    labeledImages: 1,
    missingFromSession: 0,
  });

  await stopTracing(contexts[0], "before-relaunch");
  await contexts[0].close();
  page = await launch();
  await expect(
    page.getByRole("navigation").getByText("Core workflow", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Source Folder Required" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Keep 1$/ })).toBeVisible();
  const [reuploadChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page
      .getByRole("button", { name: 'Select Folder "photos"', exact: true })
      .click(),
  ]);
  await reuploadChooser.setFiles(uploadDir);
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(2);
  await verifyAssignment(page);
  await page.getByRole("button", { name: /^Keep 1$/ }).click();
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(1);
  await expect(
    page
      .getByRole("main")
      .getByRole("img", { name: "test-image-2.png", exact: true }),
  ).toBeVisible();
  await verifyZip(page, "after-relaunch.zip");
});
