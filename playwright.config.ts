import { defineConfig } from "@playwright/test";
import path from "path";

const home = process.env.HOME ?? "/home/claude-svc";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "npx serve out -p 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: path.join(
            home,
            ".cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
          ),
          env: {
            ...process.env,
            LD_LIBRARY_PATH: [
              path.join(home, "local-libs/usr/lib/x86_64-linux-gnu"),
              process.env.LD_LIBRARY_PATH,
            ]
              .filter(Boolean)
              .join(":"),
            FONTCONFIG_FILE: path.join(home, "fontconfig-custom.conf"),
          },
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-software-rasterizer",
            "--no-zygote",
          ],
        },
      },
    },
  ],
});
