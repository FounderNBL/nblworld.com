import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:"./tests",
  // Protected University/Chat browser suites moved to newbeansland.org; keep legacy files archived here.
  testMatch:"**/sales-handoff.spec.mjs",
  timeout:30000,
  expect:{timeout:7500},
  use:{baseURL:process.env.NBL_WORLD_BASE_URL||"http://127.0.0.1:4173",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[
    {name:"desktop",use:{...devices["Desktop Chrome"]}},
    {name:"mobile",use:{...devices["Pixel 7"]}}
  ]
});
