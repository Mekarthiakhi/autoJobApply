import { chromium } from 'playwright';

// Helper to inject a visible virtual mouse cursor and highlight on click
async function enableVisualMouse(page) {
  await page.evaluate(() => {
    if (document.getElementById('virtual-mouse-cursor')) return;

    const cursor = document.createElement('div');
    cursor.id = 'virtual-mouse-cursor';
    cursor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.7);
      border: 2px solid #ffffff;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(99, 102, 241, 0.6);
      pointer-events: none;
      z-index: 999999;
      transform: translate(-50%, -50%);
      transition: transform 0.08s ease, width 0.15s ease, height 0.15s ease, background 0.15s ease;
    `;
    document.body.appendChild(cursor);

    window.__updateCursor = (x, y, isClick = false) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      if (isClick) {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursor.style.background = 'rgba(74, 222, 128, 0.9)';
        setTimeout(() => {
          cursor.style.transform = 'translate(-50%, -50%) scale(1)';
          cursor.style.background = 'rgba(239, 68, 68, 0.7)';
        }, 200);
      }
    };
  });
}

// Move mouse smoothly to element like a human
async function humanMoveAndClick(page, element, label = '') {
  if (!element) return;
  const box = await element.boundingBox();
  if (!box) {
    await element.click();
    return;
  }

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  console.log(`  🖱️ [Human Mouse] Moving to ${label || 'element'} at (${Math.round(targetX)}, ${Math.round(targetY)})...`);
  
  // Smooth mouse movement in steps
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.evaluate(({ x, y }) => window.__updateCursor && window.__updateCursor(x, y, false), { x: targetX, y: targetY });
  await page.waitForTimeout(300);

  // Click animation
  console.log(`  👆 [Human Click] Clicking ${label}...`);
  await page.evaluate(({ x, y }) => window.__updateCursor && window.__updateCursor(x, y, true), { x: targetX, y: targetY });
  await page.mouse.click(targetX, targetY);
  await page.waitForTimeout(600);
}

async function humanType(page, element, text, label = '') {
  await humanMoveAndClick(page, element, label);
  console.log(`  ⌨️ [Human Type] Typing "${text}" into ${label}...`);
  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.floor(Math.random() * 50) + 50 }); // 50-100ms per keystroke
  }
  await page.waitForTimeout(400);
}

async function runHumanBrowser() {
  console.log('\n===============================================================');
  console.log('🚀 LAUNCHING VISIBLE REAL BROWSER ON YOUR DESKTOP');
  console.log('   Performing realistic human interactions step-by-step...');
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('dialog', async (d) => {
    console.log(`  💬 [Dialog Alert] "${d.message()}" -> Dismissing`);
    await page.waitForTimeout(1000);
    await d.accept();
  });

  // STEP 1: Navigate to localhost:3000
  console.log('📍 Step 1: Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await enableVisualMouse(page);
  await page.waitForTimeout(1500);

  // STEP 2: Human types login credentials
  console.log('📍 Step 2: Logging in with human typing and clicks...');
  const emailInput = await page.waitForSelector('input[type="email"]');
  await humanType(page, emailInput, 'test.user@autojobapply.local', 'Email Address');

  const passwordInput = await page.waitForSelector('input[type="password"]');
  await humanType(page, passwordInput, 'TestPassword123!', 'Password');

  const signInBtn = await page.waitForSelector('button[type="submit"]');
  await humanMoveAndClick(page, signInBtn, 'Sign In Button');

  // STEP 3: Arrived on Dashboard
  console.log('📍 Step 3: Arriving on Dashboard...');
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 15000 });
  await enableVisualMouse(page);
  await page.waitForTimeout(1500);

  // STEP 4: Inspect the compact metric cards
  console.log('📍 Step 4: Hovering over the compact KPI cards to inspect metrics...');
  const cards = await page.$$('.kpi-card');
  for (let i = 0; i < Math.min(cards.length, 4); i++) {
    const card = cards[i];
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
      await page.evaluate(({ x, y }) => window.__updateCursor && window.__updateCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      await page.waitForTimeout(500);
    }
  }

  // STEP 5: Interact with Filter Drawer
  console.log('📍 Step 5: Testing Filters drawer...');
  const filterBtn = await page.$('button:has-text("Filters")');
  if (filterBtn) {
    await humanMoveAndClick(page, filterBtn, 'Filters Toggle Button');
    await page.waitForTimeout(1200);

    const companyInput = await page.$('input[placeholder="Filter by company..."]');
    if (companyInput) {
      await humanType(page, companyInput, 'Apex', 'Company Filter');
      await page.waitForTimeout(1000);
    }

    const clearBtn = await page.$('button:has-text("Clear all filters")');
    if (clearBtn) {
      await humanMoveAndClick(page, clearBtn, 'Clear All Filters');
    }

    await humanMoveAndClick(page, filterBtn, 'Close Filters Toggle');
    await page.waitForTimeout(800);
  }

  // STEP 6: Click "Test Agent as User" on Dashboard Header
  console.log('📍 Step 6: Testing "Test Agent as User" button on Dashboard...');
  const dashTestBtn = await page.$('button:has-text("Test Agent as User")');
  if (dashTestBtn) {
    await humanMoveAndClick(page, dashTestBtn, 'Dashboard Test Agent Button');
    await page.waitForTimeout(2500);
  }

  // STEP 7: Navigate to Agents Studio via Sidebar
  console.log('📍 Step 7: Navigating to Agents Studio in Sidebar...');
  const agentsLink = await page.$('a[href="/agents"]');
  if (agentsLink) {
    await humanMoveAndClick(page, agentsLink, 'Agents Studio Sidebar Link');
  } else {
    await page.goto('http://localhost:3000/agents');
  }
  await page.waitForFunction(() => window.location.pathname.includes('/agents'), { timeout: 10000 });
  await enableVisualMouse(page);
  await page.waitForTimeout(2000);

  // STEP 8: Create a Custom Agent
  console.log('📍 Step 8: Creating a Custom Candidate Agent...');
  const createAgentBtn = await page.$('button:has-text("Create Custom Agent")');
  if (createAgentBtn) {
    await humanMoveAndClick(page, createAgentBtn, 'Create Custom Agent Button');
    await page.waitForTimeout(800);

    const nameInput = await page.$('input[placeholder="e.g. Remote Lead Scout"]');
    if (nameInput) {
      await humanType(page, nameInput, 'High-Priority Remote Scout', 'Agent Name Input');
    }

    const roleInput = await page.$('input[placeholder="e.g. Senior Full Stack Engineer"]');
    if (roleInput) {
      // Clear previous text
      await roleInput.fill('');
      await humanType(page, roleInput, 'Staff Platform Engineer', 'Target Role Input');
    }

    const saveBtn = await page.$('button:has-text("Save & Deploy Agent")');
    if (saveBtn) {
      await humanMoveAndClick(page, saveBtn, 'Save & Deploy Agent Button');
      await page.waitForTimeout(1500);
    }
  }

  // STEP 9: Run Stepper in Agents Studio
  console.log('📍 Step 9: Running "Test Agent as User" in Agents Studio to watch Stepper...');
  const studioTestBtn = await page.$('button:has-text("Test Agent as User")');
  if (studioTestBtn) {
    await humanMoveAndClick(page, studioTestBtn, 'Agents Studio Test Runner');
    console.log('  Watching real-time 5-phase execution stepper...');
    await page.waitForTimeout(4000);
  }

  // STEP 10: Check Review Queue
  console.log('📍 Step 10: Navigating to Human-in-the-Loop Review Queue...');
  const reviewLink = await page.$('a[href="/review-queue"]');
  if (reviewLink) {
    await humanMoveAndClick(page, reviewLink, 'Review Queue Sidebar Link');
  } else {
    await page.goto('http://localhost:3000/review-queue');
  }
  await page.waitForFunction(() => window.location.pathname.includes('/review-queue'), { timeout: 10000 });
  await enableVisualMouse(page);
  await page.waitForTimeout(2500);

  // STEP 11: Check Job Search
  console.log('📍 Step 11: Navigating to Job Search...');
  const jobsLink = await page.$('a[href="/jobs"]');
  if (jobsLink) {
    await humanMoveAndClick(page, jobsLink, 'Job Search Sidebar Link');
  } else {
    await page.goto('http://localhost:3000/jobs');
  }
  await page.waitForFunction(() => window.location.pathname.includes('/jobs'), { timeout: 10000 });
  await enableVisualMouse(page);
  await page.waitForTimeout(2500);

  // STEP 12: Check Analytics
  console.log('📍 Step 12: Navigating to Analytics & switching tabs...');
  const analyticsLink = await page.$('a[href="/analytics"]');
  if (analyticsLink) {
    await humanMoveAndClick(page, analyticsLink, 'Analytics Sidebar Link');
  } else {
    await page.goto('http://localhost:3000/analytics');
  }
  await page.waitForFunction(() => window.location.pathname.includes('/analytics'), { timeout: 10000 });
  await enableVisualMouse(page);
  await page.waitForTimeout(1500);

  const funnelTab = await page.$('button:has-text("Application Funnel")');
  if (funnelTab) await humanMoveAndClick(page, funnelTab, 'Application Funnel Tab');

  const sourcesTab = await page.$('button:has-text("Source Performance")');
  if (sourcesTab) await humanMoveAndClick(page, sourcesTab, 'Source Performance Tab');

  const agentsTab = await page.$('button:has-text("Multi-Agent Health")');
  if (agentsTab) await humanMoveAndClick(page, agentsTab, 'Multi-Agent Health Tab');

  // STEP 13: Return to Dashboard
  console.log('📍 Step 13: Returning to Dashboard...');
  const dashLink = await page.$('a[href="/dashboard"]');
  if (dashLink) {
    await humanMoveAndClick(page, dashLink, 'Dashboard Sidebar Link');
  } else {
    await page.goto('http://localhost:3000/dashboard');
  }
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 10000 });
  await enableVisualMouse(page);

  console.log('\n===============================================================');
  console.log('✅ HUMAN BROWSER DEMO COMPLETED!');
  console.log('   The browser will remain OPEN on your desktop.');
  console.log('   You can see it right now, move your mouse, click buttons,');
  console.log('   and interact with the application freely!');
  console.log('===============================================================\n');

  // Keep open for 1 hour so the user has permanent access right in front of them
  await page.waitForTimeout(3600000);
}

runHumanBrowser().catch((err) => {
  console.error('Human browser error:', err);
});
