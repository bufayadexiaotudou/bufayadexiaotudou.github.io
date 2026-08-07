// ==UserScript==
// @name         国家中小学智慧教育平台 - 2倍速自动连播
// @name:en      SmartEdu - 2x Auto Playlist
// @namespace    https://github.com/bufayadexiaotudou/
// @version      1.0.0
// @description  自动将课程视频设为 2 倍速，播放结束后自动切换到下一视频，并提供悬浮控制窗。
// @description:en Force course videos to 2x speed, automatically advance to the next video, and provide a movable control panel.
// @author       bufayadexiaotudou
// @match        https://basic.smartedu.cn/teacherTraining/courseDetail*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/smartedu-auto-playlist.user.js
// @updateURL    https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/smartedu-auto-playlist.user.js
// ==/UserScript==

(() => {
  'use strict';

  const SPEED = 2;
  const ITEM_SELECTOR = '.resource-item.resource-item-train, .resource-item';
  const HEADER_SELECTOR = '.fish-collapse-header';
  const SECTION_SELECTOR = '.fish-collapse-item';
  const CATALOG_SELECTOR = '.tcourse-catalog';
  const VIDEO_SELECTOR = 'video.vjs-tech, video';

  const state = {
    enabled: true,
    advancing: false,
    currentVideo: null,
    lastEndedVideo: null,
    playBlocked: false,
    status: '等待播放器…',
  };

  let ui = null;
  let statusEl = null;
  let currentEl = null;
  let progressEl = null;
  let toggleBtn = null;
  let miniBtn = null;
  let timer = null;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function getCatalog() {
    return document.querySelector(CATALOG_SELECTOR);
  }

  function getTopSections() {
    const catalog = getCatalog();
    if (!catalog) return [];
    return [...catalog.children].filter(el => el.matches?.(SECTION_SELECTOR));
  }

  function getItems(section) {
    if (!section) return [];
    return [...section.querySelectorAll(ITEM_SELECTOR)].filter(isVideoItem);
  }

  function isVideoItem(el) {
    if (!el) return false;
    const img = el.querySelector('img');
    if (!img) return true;
    const src = img.getAttribute('src') || '';
    return /video/i.test(src) || /视频/.test(img.alt || '');
  }

  function getCurrentItem() {
    return document.querySelector('.resource-item.resource-item-active, .resource-item-active');
  }

  function itemTitle(item) {
    if (!item) return '未识别当前视频';
    const clone = item.cloneNode(true);
    clone.querySelectorAll('.status-icon, svg, i').forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim() || '未命名视频';
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '--:--';
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  function setStatus(text) {
    state.status = text;
    if (statusEl) statusEl.textContent = text;
  }

  function refreshUI() {
    if (!ui) return;
    const item = getCurrentItem();
    if (currentEl) currentEl.textContent = itemTitle(item);

    const v = state.currentVideo && document.contains(state.currentVideo)
      ? state.currentVideo
      : document.querySelector(VIDEO_SELECTOR);

    if (progressEl) {
      progressEl.textContent = v
        ? `${formatTime(v.currentTime)} / ${formatTime(v.duration)} · ${v.playbackRate.toFixed(1)}×`
        : `--:-- / --:-- · ${SPEED.toFixed(1)}×`;
    }

    if (toggleBtn) {
      toggleBtn.textContent = state.enabled ? '暂停自动连播' : '开启自动连播';
      toggleBtn.dataset.on = String(state.enabled);
    }
  }

  async function waitFor(fn, timeout = 5000, interval = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = fn();
      if (value) return value;
      await sleep(interval);
    }
    return null;
  }

  async function ensureSectionOpen(section) {
    if (!section) return false;
    const header = section.querySelector(`:scope > ${HEADER_SELECTOR}`) || section.querySelector(HEADER_SELECTOR);
    if (!header) return false;

    const expanded = header.getAttribute('aria-expanded') === 'true' || section.classList.contains('fish-collapse-item-active');
    if (!expanded) {
      header.click();
      await waitFor(() => {
        const h = section.querySelector(`:scope > ${HEADER_SELECTOR}`) || section.querySelector(HEADER_SELECTOR);
        return h?.getAttribute('aria-expanded') === 'true' || getItems(section).length > 0;
      }, 4000);
      await sleep(150);
    }
    return true;
  }

  async function clickItem(item, reason = '切换视频') {
    if (!item) return false;
    setStatus(`${reason}：${itemTitle(item)}`);

    const oldVideo = document.querySelector(VIDEO_SELECTOR);
    const oldSrc = oldVideo?.currentSrc || oldVideo?.src || '';
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    item.click();

    await waitFor(() => {
      const v = document.querySelector(VIDEO_SELECTOR);
      const src = v?.currentSrc || v?.src || '';
      return (v && v !== oldVideo) || (src && src !== oldSrc) || item.classList.contains('resource-item-active');
    }, 7000);

    await sleep(300);
    const v = document.querySelector(VIDEO_SELECTOR);
    if (v) {
      bindVideo(v);
      forceSpeed(v);
      await safePlay(v);
    }
    refreshUI();
    return true;
  }

  async function playFirst() {
    if (state.advancing) return;
    state.advancing = true;
    try {
      const sections = getTopSections();
      for (const section of sections) {
        await ensureSectionOpen(section);
        const items = getItems(section);
        if (items.length) {
          await clickItem(items[0], '从第一节开始');
          return;
        }
      }
      setStatus('没有找到可播放的视频');
    } finally {
      state.advancing = false;
    }
  }

  async function playNext() {
    if (state.advancing) return;
    state.advancing = true;
    try {
      const current = getCurrentItem();
      const sections = getTopSections();
      if (!sections.length) {
        setStatus('没有找到课程目录');
        return;
      }

      if (!current) {
        for (const section of sections) {
          await ensureSectionOpen(section);
          const items = getItems(section);
          if (items.length) {
            await clickItem(items[0], '播放第一条视频');
            return;
          }
        }
        setStatus('没有找到可播放的视频');
        return;
      }

      const section = current.closest(SECTION_SELECTOR);
      if (section) {
        const items = getItems(section);
        const index = items.indexOf(current);
        if (index >= 0 && index + 1 < items.length) {
          await clickItem(items[index + 1], '下一视频');
          return;
        }
      }

      const sectionIndex = sections.indexOf(section);
      for (let i = Math.max(0, sectionIndex + 1); i < sections.length; i++) {
        await ensureSectionOpen(sections[i]);
        const items = getItems(sections[i]);
        if (items.length) {
          await clickItem(items[0], '下一章节');
          return;
        }
      }

      setStatus('全部视频已播放完成 ✓');
      state.enabled = false;
      refreshUI();
    } catch (err) {
      console.error('[SmartEdu AutoPlay] 切换下一视频失败：', err);
      setStatus(`切换失败：${err?.message || err}`);
    } finally {
      state.advancing = false;
    }
  }

  function forceSpeed(video) {
    if (!video) return;
    try {
      video.defaultPlaybackRate = SPEED;
      if (video.playbackRate !== SPEED) video.playbackRate = SPEED;
    } catch (err) {
      console.warn('[SmartEdu AutoPlay] 设置倍速失败：', err);
    }
  }

  async function safePlay(video) {
    if (!video || !state.enabled) return;
    forceSpeed(video);
    try {
      const p = video.play();
      if (p?.then) await p;
      state.playBlocked = false;
      setStatus(`自动连播中 · ${SPEED}×`);
    } catch (err) {
      state.playBlocked = true;
      setStatus('浏览器阻止自动播放；手动点一次播放即可');
      console.debug('[SmartEdu AutoPlay] play() 被浏览器阻止：', err);
    }
  }

  function handleEnded(video) {
    if (!state.enabled || state.advancing) return;
    if (state.lastEndedVideo === video) return;
    state.lastEndedVideo = video;
    setStatus('本视频已结束，正在切换下一条…');
    setTimeout(() => {
      if (state.enabled) playNext();
    }, 600);
  }

  function bindVideo(video) {
    if (!video || video.dataset.smarteduAutoBound === '1') {
      if (video) {
        state.currentVideo = video;
        forceSpeed(video);
      }
      return;
    }

    video.dataset.smarteduAutoBound = '1';
    state.currentVideo = video;
    state.lastEndedVideo = null;
    forceSpeed(video);

    const reinforce = () => {
      if (state.enabled) forceSpeed(video);
      refreshUI();
    };

    video.addEventListener('loadedmetadata', () => {
      reinforce();
      if (state.enabled) safePlay(video);
    });
    video.addEventListener('canplay', reinforce);
    video.addEventListener('play', reinforce);
    video.addEventListener('ratechange', reinforce);
    video.addEventListener('ended', () => handleEnded(video));
    video.addEventListener('timeupdate', () => {
      if (!state.enabled || state.advancing || !Number.isFinite(video.duration)) return;
      if (video.duration > 0 && video.currentTime >= video.duration - 0.25) handleEnded(video);
    });

    if (state.enabled) safePlay(video);
    refreshUI();
  }

  function scanVideos() {
    document.querySelectorAll(VIDEO_SELECTOR).forEach(bindVideo);
  }

  function createUI() {
    if (document.getElementById('smartedu-auto-panel')) return;

    const style = document.createElement('style');
    style.textContent = `
      #smartedu-auto-panel {
        position: fixed; right: 20px; top: 120px; z-index: 2147483647;
        width: 286px; box-sizing: border-box; padding: 0;
        color: #eaf2ff; background: rgba(20, 24, 32, .94);
        border: 1px solid rgba(255,255,255,.14); border-radius: 12px;
        box-shadow: 0 10px 35px rgba(0,0,0,.32); font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        backdrop-filter: blur(10px); overflow: hidden;
      }
      #smartedu-auto-panel * { box-sizing: border-box; }
      #smartedu-auto-panel .sa-head {
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:10px 12px; cursor:move; user-select:none; background:rgba(255,255,255,.055); font-weight:700;
      }
      #smartedu-auto-panel .sa-mini {
        border:0; background:transparent; color:#b8c4d8; cursor:pointer; font-size:18px; line-height:1; padding:0 2px;
      }
      #smartedu-auto-panel .sa-body { padding: 11px 12px 12px; }
      #smartedu-auto-panel .sa-label { color:#8fa0b8; font-size:12px; margin-bottom:3px; }
      #smartedu-auto-panel .sa-current { color:#fff; font-weight:600; max-height:42px; overflow:hidden; margin-bottom:8px; }
      #smartedu-auto-panel .sa-progress { color:#91d4ff; font-variant-numeric: tabular-nums; margin-bottom:7px; }
      #smartedu-auto-panel .sa-status { color:#b9c8dc; min-height:19px; margin-bottom:10px; }
      #smartedu-auto-panel .sa-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      #smartedu-auto-panel button.sa-btn {
        appearance:none; border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:8px 9px;
        color:#eaf2ff; background:#303949; cursor:pointer; font-weight:600;
      }
      #smartedu-auto-panel button.sa-btn:hover { filter:brightness(1.13); }
      #smartedu-auto-panel button.sa-btn[data-on="true"] { background:#1769aa; }
      #smartedu-auto-panel .sa-wide { grid-column:1 / -1; }
      #smartedu-auto-panel.sa-collapsed .sa-body { display:none; }
      #smartedu-auto-panel.sa-collapsed { width:220px; }
    `;
    document.documentElement.appendChild(style);

    ui = document.createElement('div');
    ui.id = 'smartedu-auto-panel';
    ui.innerHTML = `
      <div class="sa-head">
        <span>智慧教育 · 2× 自动连播</span>
        <button class="sa-mini" type="button" title="收起/展开">−</button>
      </div>
      <div class="sa-body">
        <div class="sa-label">当前视频</div>
        <div class="sa-current">正在识别…</div>
        <div class="sa-progress">--:-- / --:-- · 2.0×</div>
        <div class="sa-status">初始化中…</div>
        <div class="sa-grid">
          <button class="sa-btn sa-wide sa-toggle" type="button">暂停自动连播</button>
          <button class="sa-btn sa-first" type="button">从第一节开始</button>
          <button class="sa-btn sa-next" type="button">立即下一节</button>
        </div>
      </div>
    `;
    document.body.appendChild(ui);

    statusEl = ui.querySelector('.sa-status');
    currentEl = ui.querySelector('.sa-current');
    progressEl = ui.querySelector('.sa-progress');
    toggleBtn = ui.querySelector('.sa-toggle');
    miniBtn = ui.querySelector('.sa-mini');

    toggleBtn.addEventListener('click', async () => {
      state.enabled = !state.enabled;
      if (state.enabled) {
        setStatus(`自动连播已开启 · ${SPEED}×`);
        scanVideos();
        const v = document.querySelector(VIDEO_SELECTOR);
        if (v) await safePlay(v);
      } else {
        setStatus('自动连播已暂停（不会自动切下一条）');
      }
      refreshUI();
    });

    ui.querySelector('.sa-first').addEventListener('click', () => {
      state.enabled = true;
      refreshUI();
      playFirst();
    });

    ui.querySelector('.sa-next').addEventListener('click', () => {
      state.enabled = true;
      refreshUI();
      playNext();
    });

    miniBtn.addEventListener('click', () => {
      ui.classList.toggle('sa-collapsed');
      miniBtn.textContent = ui.classList.contains('sa-collapsed') ? '+' : '−';
    });

    makeDraggable(ui, ui.querySelector('.sa-head'));
    refreshUI();
  }

  function makeDraggable(panel, handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.right = 'auto';
      handle.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });

    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
      panel.style.left = `${Math.min(maxLeft, Math.max(0, startLeft + e.clientX - startX))}px`;
      panel.style.top = `${Math.min(maxTop, Math.max(0, startTop + e.clientY - startY))}px`;
    });

    const stop = () => { dragging = false; };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }

  function boot() {
    createUI();
    scanVideos();

    const observer = new MutationObserver(() => {
      scanVideos();
      refreshUI();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    timer = window.setInterval(() => {
      scanVideos();
      const v = document.querySelector(VIDEO_SELECTOR);
      if (v && state.enabled) forceSpeed(v);
      refreshUI();
    }, 1000);

    setStatus(`自动连播已开启 · ${SPEED}×`);
    refreshUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
