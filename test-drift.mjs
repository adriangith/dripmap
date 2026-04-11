import { chromium } from 'playwright';

const URL = 'https://bright-oak-33r9.vercel.app';
const browser = await chromium.launch({ headless: true });
const errors = [];

// ─── TEST: Mobile - scroll cards then open detail ───────────
console.log('=== Mobile: Scroll + Detail ===');
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const mp = await mCtx.newPage();
mp.on('pageerror', e => errors.push('MOBILE_PAGE_ERROR: ' + e.message));

await mp.goto(URL, { waitUntil: 'networkidle' });
await mp.waitForTimeout(2000);

// Expand sheet
await mp.evaluate(() => {
  const inputs = document.querySelectorAll('input[placeholder="Search places..."]');
  for (const inp of inputs) {
    if (inp.getBoundingClientRect().width > 0) { inp.focus(); break; }
  }
});
await mp.waitForTimeout(800);

// Scroll down in card list
await mp.evaluate(() => {
  const scrollable = document.querySelector('.fixed.bottom-0 .overflow-y-auto');
  if (scrollable) scrollable.scrollTop = 500;
});
await mp.waitForTimeout(500);

// Open a card from scrolled position
const scrolledCard = await mp.evaluate(() => {
  const cards = document.querySelectorAll('button.block.rounded-lg');
  if (cards.length > 5) {
    cards[5].click();
    const h3 = cards[5].querySelector('h3');
    return h3 ? h3.textContent : 'unknown';
  }
  return null;
});
console.log('Opened card from scroll: ' + scrolledCard);
await mp.waitForTimeout(1500);

// Verify detail loaded
const detailCheck = await mp.evaluate(() => {
  const sheet = document.querySelector('.fixed.bottom-0');
  if (!sheet) return 'no sheet';
  return sheet.innerHTML.includes('lucide-arrow-left') ? 'detail loaded' : 'no detail';
});
console.log('Detail status: ' + detailCheck);

// Go back
await mp.evaluate(() => {
  const back = document.querySelector('.fixed.bottom-0 svg.lucide-arrow-left');
  if (back) {
    const btn = back.closest('button');
    if (btn) btn.click();
  }
});
await mp.waitForTimeout(800);

// Check scroll position is maintained
const scrollPos = await mp.evaluate(() => {
  const scrollable = document.querySelector('.fixed.bottom-0 .overflow-y-auto');
  return scrollable ? scrollable.scrollTop : -1;
});
console.log('Scroll position after back: ' + scrollPos + ' (was 500)');

// ─── TEST: Multiple rapid filter toggles ────────────────────
console.log('\n=== Rapid Filter Toggles ===');
for (let i = 0; i < 5; i++) {
  await mp.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const swim = btns.find(b => b.textContent.trim() === 'Swims' && b.getBoundingClientRect().width > 0);
    if (swim) swim.click();
  });
  await mp.waitForTimeout(100);
}
await mp.waitForTimeout(500);

const afterRapidFilter = await mp.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const swim = btns.find(b => b.textContent.trim() === 'Swims' && b.getBoundingClientRect().width > 0);
  const isActive = swim ? swim.className.includes('blue') || swim.className.includes('active') : false;
  const cards = document.querySelectorAll('button.block.rounded-lg');
  return { swimActive: isActive, swimClasses: swim ? swim.className.substring(0, 100) : 'n/a', cardCount: cards.length };
});
console.log('After 5 rapid toggles: ' + JSON.stringify(afterRapidFilter));

// ─── TEST: Mobile - landscape orientation ───────────────────
console.log('\n=== Mobile Landscape ===');
await mp.setViewportSize({ width: 844, height: 390 });
await mp.waitForTimeout(500);

const landscapeSheet = await mp.evaluate(() => {
  const sheet = document.querySelector('.fixed.bottom-0');
  if (!sheet) return 'no sheet';
  const rect = sheet.getBoundingClientRect();
  return JSON.stringify({
    height: Math.round(rect.height),
    width: Math.round(rect.width),
    visible: rect.height > 0,
  });
});
console.log('Landscape sheet: ' + landscapeSheet);

// Reset to portrait
await mp.setViewportSize({ width: 390, height: 844 });
await mp.waitForTimeout(500);

// ─── TEST: Desktop sidebar filtering ────────────────────────
console.log('\n=== Desktop Sidebar Filtering ===');
const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const dp = await dCtx.newPage();
dp.on('pageerror', e => errors.push('DESKTOP_PAGE_ERROR: ' + e.message));

await dp.goto(URL, { waitUntil: 'networkidle' });
await dp.waitForTimeout(2000);

// Click "Swims" in sidebar
await dp.evaluate(() => {
  const sidebar = document.querySelector('.lg\\:flex.lg\\:flex-col');
  if (!sidebar) return;
  const btns = Array.from(sidebar.querySelectorAll('button'));
  const swim = btns.find(b => b.textContent.trim() === 'Swims');
  if (swim) swim.click();
});
await dp.waitForTimeout(500);

const swimFilter = await dp.evaluate(() => {
  const sidebar = document.querySelector('.lg\\:flex.lg\\:flex-col');
  if (!sidebar) return {};
  const cards = sidebar.querySelectorAll('a[href*="/location/"]');
  return { count: cards.length };
});
console.log('Desktop Swims filter: ' + JSON.stringify(swimFilter));

// Test desktop context bar
await dp.evaluate(() => {
  const sidebar = document.querySelector('.lg\\:flex.lg\\:flex-col');
  if (!sidebar) return;
  const btns = Array.from(sidebar.querySelectorAll('button'));
  const cost = btns.find(b => b.textContent.trim() === 'Cost');
  if (cost) cost.click();
});
await dp.waitForTimeout(500);

const desktopCostPopover = await dp.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const freeBtn = btns.find(b => b.textContent.includes('Free only'));
  return { hasFreeOption: !!freeBtn };
});
console.log('Desktop cost popover: ' + JSON.stringify(desktopCostPopover));

// ─── TEST: About page navigation ────────────────────────────
console.log('\n=== About Page ===');
// Check if there's a link to about page from home
const aboutLinkExists = await dp.evaluate(() => {
  const links = document.querySelectorAll('a[href="/about"]');
  return { count: links.length, texts: Array.from(links).map(l => l.textContent.trim()) };
});
console.log('About page links: ' + JSON.stringify(aboutLinkExists));

await dp.goto(URL + '/about', { waitUntil: 'networkidle' });
await dp.waitForTimeout(1000);

const aboutPage = await dp.evaluate(() => {
  const h1 = document.querySelector('h1');
  const backLink = document.querySelector('a[href="/"]');
  const content = document.body.textContent.substring(0, 500);
  return {
    title: h1 ? h1.textContent : 'missing',
    hasBackLink: !!backLink,
    hasContent: content.length > 100,
  };
});
console.log('About page: ' + JSON.stringify(aboutPage));

// ─── TEST: Keyboard navigation ──────────────────────────────
console.log('\n=== Keyboard Navigation ===');
await dp.goto(URL, { waitUntil: 'networkidle' });
await dp.waitForTimeout(2000);

// Tab through elements
await dp.keyboard.press('Tab');
await dp.waitForTimeout(200);
const focusedEl = await dp.evaluate(() => {
  const el = document.activeElement;
  return el ? el.tagName + ': ' + (el.textContent || '').trim().substring(0, 50) : 'none';
});
console.log('First tab focus: ' + focusedEl);

// ─── TEST: PWA manifest ─────────────────────────────────────
console.log('\n=== PWA Manifest ===');
const manifestResp = await dp.goto(URL + '/manifest.json', { waitUntil: 'networkidle' });
if (manifestResp) {
  const manifest = await manifestResp.json().catch(() => null);
  if (manifest) {
    console.log('Manifest name: ' + manifest.name);
    console.log('Manifest theme: ' + manifest.theme_color);
    console.log('Manifest icons: ' + (manifest.icons ? manifest.icons.length : 0));
  } else {
    console.log('Manifest: invalid JSON');
  }
}

// Print errors
console.log('\n=== Errors ===');
if (errors.length === 0) console.log('No errors!');
else errors.forEach(e => console.log(e));

await browser.close();
console.log('Done.');
