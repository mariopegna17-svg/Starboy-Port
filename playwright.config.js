import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
export default defineConfig({
  testDir:'./tests/browser',timeout:60000,expect:{timeout:10000},workers:2,
  use:{baseURL:'http://127.0.0.1:3000',viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true,headless:true,launchOptions:{executablePath,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']},screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm start',url:'http://127.0.0.1:3000/healthz',reuseExistingServer:!process.env.CI,timeout:20000}
});
