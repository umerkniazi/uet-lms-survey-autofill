// ==UserScript==
// @name         UET LMS Survey Auto-Fill
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically fills and submits surveys on the UET LMS portal seamlessly.
// @author       Umer Khan Niazi
// @match        https://lms.uet.edu.pk/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --- Configuration ---
  const RATING = '4';              // Target label for standard rating questions
  const ATTENDANCE = '81-100';     // Target label for attendance questions
  const BOT_KEY = 'uet_survey_bot_active';

  // --- State Management ---
  function isActive() { return localStorage.getItem(BOT_KEY) === 'true'; }
  function setActive(val) { localStorage.setItem(BOT_KEY, val ? 'true' : 'false'); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Waits for a specific DOM element to appear
  function waitForElement(findFn, maxMs = 10000, interval = 200) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const el = findFn();
        if (el) { clearInterval(timer); resolve(el); return; }
        if (Date.now() - start > maxMs) {
          clearInterval(timer);
          reject(new Error('timeout'));
        }
      }, interval);
    });
  }

  // Extracts visible text from a radio button's label
  function getLabelText(radio) {
    const byFor = document.querySelector('label[for="' + radio.id + '"]');
    if (byFor) return byFor.textContent.trim();
    const wrapped = radio.closest('label');
    if (wrapped) return wrapped.textContent.trim();
    const sib = radio.nextElementSibling;
    if (sib) return sib.textContent.trim();
    return '';
  }

  // Groups radio buttons by their 'name' attribute
  function getGroups() {
    const groups = {};
    document.querySelectorAll('input[type="radio"]').forEach(r => {
      if (!r.name) return;
      if (!groups[r.name]) groups[r.name] = [];
      groups[r.name].push(r);
    });
    return Object.values(groups);
  }

  // ── Survey Navigation & Execution ─────────────────────────────────────────

  async function handleStartPage() {
    try {
      const btn = await waitForElement(() =>
        [...document.querySelectorAll('a, button')]
          .find(el => el.textContent && el.textContent.toLowerCase().includes('start survey'))
      );
      await sleep(500); 
      btn.click();
    } catch (e) { /* Button not found */ }
  }

  async function handleFillPage() {
    const start = Date.now();
    let foundRadios = false;

    // Detect if page is "Thank You" screen or actual questionnaire
    while (Date.now() - start < 10000) {
      const goBackBtn = [...document.querySelectorAll('a')].find(el => el.textContent && el.textContent.toLowerCase().includes('go back to surveys'));
      if (goBackBtn) {
        await sleep(1000);
        goBackBtn.click();
        return;
      }

      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length >= 10) {
        foundRadios = true;
        break;
      }
      await sleep(300);
    }

    if (!foundRadios) return;

    // Execute Auto-Fill
    await sleep(500);
    const groups = getGroups();

    groups.forEach((group, i) => {
      const targetLabel = i === 0 ? ATTENDANCE : RATING;
      const target = group.find(r => {
        const lbl = getLabelText(r);
        return lbl === targetLabel || lbl.replace(/\s/g,'').includes(targetLabel.replace(/\s/g,''));
      });
      if (target) target.click();
    });

    await sleep(700);

    try {
      const submitBtn = await waitForElement(() => document.querySelector('button[type="submit"], input[type="submit"], button.btn-primary'), 5000);
      submitBtn.click();
    } catch (e) { /* Submit failed */ }
  }

  // ── Odoo SPA Controller ───────────────────────────────────────────────────

  function getVisibleButtons(textMatch) {
    return [...document.querySelectorAll('button, a.btn, td button')]
      .filter(el => 
        el.textContent && 
        el.textContent.includes(textMatch) && 
        !el.disabled && 
        el.offsetParent !== null 
      );
  }

  function updateBtnUI() {
    const btn = document.getElementById('uet-auto-btn');
    if (!btn) return;
    btn.innerText = isActive() ? '⏹ Stop Auto-Fill' : '▶ Auto-Fill All Surveys';
    btn.style.background = isActive() ? '#dc3545' : '#198754';
  }

  function injectUI() {
    if (document.getElementById('uet-auto-btn')) {
      updateBtnUI();
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'uet-auto-btn';
    btn.style.cssText = `
      position: fixed; top: 12px; right: 180px; z-index: 99999;
      color: #fff; border: none; padding: 7px 15px; border-radius: 6px;
      font-size: 13px; font-weight: 500; cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: background 0.2s;
    `;
    
    btn.onclick = () => {
      setActive(!isActive());
      updateBtnUI();
    };
    
    document.body.appendChild(btn);
    updateBtnUI();
  }

  // ── Router & Main Loop ────────────────────────────────────────────────────

  const currentUrl = window.location.href;

  if (currentUrl.includes('/survey/start/')) {
    handleStartPage();
  } else if (currentUrl.includes('/survey/fill/')) {
    handleFillPage();
  } else if (currentUrl.includes('/web')) {
    
    let lastClickTime = 0;

    // The Pulse: Check state safely every 1.5s to bypass Odoo SPA lag
    setInterval(() => {
      injectUI();
      
      if (!isActive()) return;
      if (Date.now() - lastClickTime < 4000) return;

      const url = window.location.href;

      // Handle Semester List Menu
      if (url.includes('model=obe.core.semester')) {
        const subBtns = getVisibleButtons('Surveys For Subjects');
        if (subBtns.length > 0) {
          subBtns[0].click();
          lastClickTime = Date.now();
        }
      } 
      // Handle Subjects List Menu
      else if (url.includes('model=obe.core.register')) {
        const fillBtns = getVisibleButtons('Fill Survey');
        if (fillBtns.length > 0) {
          fillBtns[0].click();
          lastClickTime = Date.now();
        } else {
          // Verify completion
          const dataRows = document.querySelectorAll('.o_data_row');
          const completedTags = [...document.querySelectorAll('*')].filter(el => el.textContent && el.textContent.includes('Survey Filled'));
          
          if (dataRows.length > 0 && completedTags.length > 0) {
             setActive(false);
             updateBtnUI();
             lastClickTime = Date.now(); 
             alert('[UET Bot] All surveys in this list are completed!');
          }
        }
      }
    }, 1500);
  }

})();