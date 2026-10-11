// Development helper. PNGs are committed; Render does not need a browser.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const svg=await readFile(new URL('../public/icon.svg',import.meta.url),'utf8');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{
  for(const [file,size,maskable] of [['icon-192.png',192,false],['icon-512.png',512,false],['icon-maskable-512.png',512,true],['apple-touch-icon.png',180,false]]){
    const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#080b09}svg{display:block;width:100%;height:100%}.icon{width:100vw;height:100vh;padding:${maskable?'9%':'0'}}</style><div class="icon">${svg}</div>`);
    await page.screenshot({path:new URL('../public/'+file,import.meta.url).pathname});await page.close();
  }
}finally{await browser.close();}
