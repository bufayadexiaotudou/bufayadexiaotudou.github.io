// ==UserScript==
// @name         Bilibili 自定义播放倍速 0.25x - 3x + 悬浮窗 + 剩余时间 安全版
// @name:en      Bilibili Custom Playback Speed 0.25x-3x + Panel + Remaining Time
// @namespace    https://github.com/bufayadexiaotudou/
// @version      1.3.1
// @description  B站自定义倍速，最高3倍，可锁定，可缩小为右侧小圆点，并显示当前倍速下剩余观看时间
// @description:en Custom Bilibili playback speed from 0.25x to 3x, with speed lock, collapsible floating panel, shortcuts, and remaining watch time.
// @author       bufayadexiaotudou
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @match        https://www.bilibili.com/list/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-custom-playback-speed.user.js
// @updateURL    https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-custom-playback-speed.user.js
// ==/UserScript==

(function () {
    'use strict';

    const MIN_RATE = 0.25;
    const MAX_RATE = 3.0;
    const STEP = 0.05;

    const STORAGE_RATE = 'bili_custom_speed_rate';
    const STORAGE_LOCK = 'bili_custom_speed_lock';
    const STORAGE_COLLAPSED = 'bili_custom_speed_collapsed';

    let currentRate = clamp(Number(localStorage.getItem(STORAGE_RATE)) || 1);
    let lockRate = localStorage.getItem(STORAGE_LOCK) !== 'false';
    let collapsed = localStorage.getItem(STORAGE_COLLAPSED) === 'true';

    let currentVideo = null;
    let applying = false;

    function clamp(rate) {
        if (!Number.isFinite(rate)) return 1;
        return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
    }

    function roundRate(rate) {
        return Math.round(rate * 100) / 100;
    }

    function formatRate(rate) {
        return `${Number(rate.toFixed(2))}x`;
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '--:--';

        seconds = Math.ceil(seconds);

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function findMainVideo() {
        const videos = [...document.querySelectorAll('video')];

        if (videos.length === 0) return null;

        return videos
            .filter(v => v.readyState >= 0)
            .sort((a, b) => {
                const areaA = (a.videoWidth || a.clientWidth || 0) * (a.videoHeight || a.clientHeight || 0);
                const areaB = (b.videoWidth || b.clientWidth || 0) * (b.videoHeight || b.clientHeight || 0);
                return areaB - areaA;
            })[0];
    }

    function getRemainingInfo() {
        const video = findMainVideo();

        if (!video) {
            return {
                shortText: '--:--',
                panelText: '剩余时间：--:--',
                nativeText: '｜剩余 --:--',
                title: '未检测到视频'
            };
        }

        const duration = video.duration;
        const currentTime = video.currentTime;
        const actualRate = video.playbackRate || currentRate || 1;

        if (!Number.isFinite(duration) || duration <= 0 || duration === Infinity) {
            return {
                shortText: '--:--',
                panelText: '剩余时间：--:--',
                nativeText: '｜剩余 --:--',
                title: '直播或无法读取总时长'
            };
        }

        const remainingRaw = Math.max(0, duration - currentTime);
        const remainingAtCurrentRate = remainingRaw / Math.max(0.01, actualRate);
        const shortText = formatDuration(remainingAtCurrentRate);

        return {
            shortText,
            panelText: `剩余时间：${shortText}`,
            nativeText: `｜剩余 ${shortText}`,
            title: `视频原始剩余 ${formatDuration(remainingRaw)}，按当前 ${formatRate(actualRate)} 速度约需 ${shortText}`
        };
    }

    function insertNativeRemainingSafely() {
        if (document.getElementById('bcs-player-remaining')) return;

        const timeElement =
            document.querySelector('.bpx-player-ctrl-time') ||
            document.querySelector('.bilibili-player-video-time') ||
            document.querySelector('.squirtle-video-time');

        if (!timeElement || !timeElement.parentElement) return;

        const span = document.createElement('span');
        span.id = 'bcs-player-remaining';
        span.textContent = '｜剩余 --:--';
        span.title = '当前倍速下剩余观看时间';

        // 关键：不要 append 到 B 站原时间元素内部，而是放到它后面
        timeElement.insertAdjacentElement('afterend', span);
    }

    function updateRemainingInfo() {
        const remaining = document.getElementById('bcs-remaining');
        const nativeRemaining = document.getElementById('bcs-player-remaining');
        const dot = document.querySelector('#bili-custom-speed-panel .bcs-dot');

        const info = getRemainingInfo();

        if (remaining) {
            remaining.textContent = info.panelText;
            remaining.title = info.title;
        }

        if (nativeRemaining) {
            nativeRemaining.textContent = info.nativeText;
            nativeRemaining.title = info.title;
        }

        if (dot) {
            dot.title = `${formatRate(currentRate)}｜${info.panelText}｜点击展开倍速面板`;
        }
    }

    function applyRate(rate = currentRate, save = true) {
        const video = findMainVideo();
        if (!video) return;

        rate = clamp(roundRate(rate));
        currentRate = rate;

        if (save) {
            localStorage.setItem(STORAGE_RATE, String(rate));
        }

        applying = true;
        video.playbackRate = rate;
        video.defaultPlaybackRate = rate;
        applying = false;

        updatePanel();
    }

    function attachVideo(video) {
        if (!video || video === currentVideo) return;

        currentVideo = video;
        applyRate(currentRate, false);

        video.addEventListener('ratechange', () => {
            if (applying) return;

            const actualRate = roundRate(video.playbackRate);

            if (lockRate && Math.abs(actualRate - currentRate) > 0.001) {
                setTimeout(() => applyRate(currentRate, false), 0);
            } else if (!lockRate) {
                currentRate = clamp(actualRate);
                localStorage.setItem(STORAGE_RATE, String(currentRate));
                updatePanel();
            }
        });

        video.addEventListener('timeupdate', updateRemainingInfo);
        video.addEventListener('durationchange', updateRemainingInfo);
        video.addEventListener('loadedmetadata', updateRemainingInfo);
        video.addEventListener('seeking', updateRemainingInfo);
        video.addEventListener('seeked', updateRemainingInfo);
        video.addEventListener('play', updateRemainingInfo);
        video.addEventListener('pause', updateRemainingInfo);
    }

    function setCollapsed(value) {
        collapsed = Boolean(value);
        localStorage.setItem(STORAGE_COLLAPSED, String(collapsed));

        const panel = document.getElementById('bili-custom-speed-panel');
        if (panel) {
            panel.dataset.collapsed = String(collapsed);
        }

        updatePanel();
    }

    function createPanel() {
        if (document.getElementById('bili-custom-speed-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bili-custom-speed-panel';
        panel.dataset.collapsed = String(collapsed);

        panel.innerHTML = `
            <div class="bcs-dot" title="点击展开倍速面板">1x</div>

            <div class="bcs-header">
                <div class="bcs-title-text">B站倍速</div>
                <button id="bcs-collapse" title="缩小为右侧小圆点">－</button>
            </div>

            <div class="bcs-content">
                <div class="bcs-row">
                    <input id="bcs-rate-input" type="number" min="${MIN_RATE}" max="${MAX_RATE}" step="${STEP}">
                    <button id="bcs-apply">应用</button>
                </div>

                <input id="bcs-range" type="range" min="${MIN_RATE}" max="${MAX_RATE}" step="${STEP}">

                <div class="bcs-buttons">
                    <button data-rate="1">1x</button>
                    <button data-rate="1.25">1.25x</button>
                    <button data-rate="1.5">1.5x</button>
                    <button data-rate="2">2x</button>
                    <button data-rate="2.5">2.5x</button>
                    <button data-rate="3">3x</button>
                </div>

                <div id="bcs-remaining" class="bcs-remaining">剩余时间：--:--</div>

                <label class="bcs-lock">
                    <input id="bcs-lock" type="checkbox">
                    锁定倍速
                </label>

                <div class="bcs-tip">Alt+[ / Alt+] 调速，Alt+\ 还原</div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #bili-custom-speed-panel {
                position: fixed;
                right: 18px;
                top: 120px;
                z-index: 999999;
                width: 180px;
                padding: 10px;
                border-radius: 10px;
                background: rgba(24, 24, 24, 0.86);
                color: #fff;
                font-size: 13px;
                font-family: Arial, "Microsoft YaHei", sans-serif;
                box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(8px);
                transition:
                    width 0.18s ease,
                    height 0.18s ease,
                    padding 0.18s ease,
                    border-radius 0.18s ease,
                    right 0.18s ease,
                    background 0.18s ease;
                user-select: none;
            }

            #bili-custom-speed-panel .bcs-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            #bili-custom-speed-panel .bcs-title-text {
                font-weight: 700;
                flex: 1;
                text-align: center;
            }

            #bili-custom-speed-panel #bcs-collapse {
                width: 24px;
                height: 22px;
                padding: 0;
                margin-left: 6px;
                border-radius: 6px;
                font-size: 16px;
                line-height: 20px;
                background: rgba(255, 255, 255, 0.16);
            }

            #bili-custom-speed-panel #bcs-collapse:hover {
                background: rgba(255, 255, 255, 0.28);
            }

            #bili-custom-speed-panel .bcs-row {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
            }

            #bili-custom-speed-panel input[type="number"] {
                width: 86px;
                padding: 4px;
                border-radius: 6px;
                border: 1px solid #666;
                background: #111;
                color: #fff;
            }

            #bili-custom-speed-panel input[type="range"] {
                width: 100%;
                margin-bottom: 8px;
            }

            #bili-custom-speed-panel button {
                cursor: pointer;
                border: none;
                border-radius: 6px;
                padding: 4px 7px;
                background: #00a1d6;
                color: #fff;
                font-size: 12px;
            }

            #bili-custom-speed-panel button:hover {
                background: #00b5e5;
            }

            #bili-custom-speed-panel .bcs-buttons {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 5px;
                margin-bottom: 8px;
            }

            #bili-custom-speed-panel .bcs-remaining {
                margin-bottom: 8px;
                padding: 5px 6px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.12);
                text-align: center;
                font-size: 12px;
                line-height: 1.4;
                color: #fff;
            }

            #bili-custom-speed-panel .bcs-lock {
                display: flex;
                align-items: center;
                gap: 5px;
                margin-bottom: 6px;
                user-select: none;
            }

            #bili-custom-speed-panel .bcs-tip {
                opacity: 0.75;
                font-size: 11px;
                line-height: 1.4;
            }

            #bili-custom-speed-panel .bcs-dot {
                display: none;
            }

            #bili-custom-speed-panel[data-collapsed="true"] {
                right: 0;
                top: 160px;
                width: 48px;
                height: 48px;
                padding: 0;
                border-radius: 999px 0 0 999px;
                background: rgba(0, 161, 214, 0.92);
                cursor: pointer;
                overflow: hidden;
            }

            #bili-custom-speed-panel[data-collapsed="true"] .bcs-header,
            #bili-custom-speed-panel[data-collapsed="true"] .bcs-content {
                display: none;
            }

            #bili-custom-speed-panel[data-collapsed="true"] .bcs-dot {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                font-size: 13px;
                font-weight: 700;
                color: #fff;
            }

            #bili-custom-speed-panel[data-collapsed="true"]:hover {
                background: rgba(0, 181, 229, 0.96);
            }

            #bcs-player-remaining {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 8px;
                height: 20px;
                line-height: 20px;
                color: rgba(255, 255, 255, 0.86);
                font-size: 13px;
                font-weight: normal;
                white-space: nowrap;
                user-select: none;
                pointer-events: none;
                transform: translateY(0px);
            }
        `;

        document.documentElement.appendChild(style);
        document.body.appendChild(panel);

        const input = document.getElementById('bcs-rate-input');
        const range = document.getElementById('bcs-range');
        const applyBtn = document.getElementById('bcs-apply');
        const lockBox = document.getElementById('bcs-lock');
        const collapseBtn = document.getElementById('bcs-collapse');

        panel.addEventListener('click', () => {
            if (collapsed) {
                setCollapsed(false);
            }
        });

        collapseBtn.addEventListener('click', e => {
            e.stopPropagation();
            setCollapsed(true);
        });

        applyBtn.addEventListener('click', () => {
            applyRate(Number(input.value));
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                applyRate(Number(input.value));
            }
        });

        range.addEventListener('input', () => {
            applyRate(Number(range.value));
        });

        lockBox.addEventListener('change', () => {
            lockRate = lockBox.checked;
            localStorage.setItem(STORAGE_LOCK, String(lockRate));
            if (lockRate) applyRate(currentRate, false);
        });

        panel.querySelectorAll('button[data-rate]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyRate(Number(btn.dataset.rate));
            });
        });

        updatePanel();
    }

    function updatePanel() {
        const input = document.getElementById('bcs-rate-input');
        const range = document.getElementById('bcs-range');
        const lockBox = document.getElementById('bcs-lock');
        const dot = document.querySelector('#bili-custom-speed-panel .bcs-dot');

        if (input) input.value = String(currentRate);
        if (range) range.value = String(currentRate);
        if (lockBox) lockBox.checked = lockRate;
        if (dot) dot.textContent = formatRate(currentRate);

        updateRemainingInfo();
    }

    function changeRate(delta) {
        applyRate(roundRate(currentRate + delta));
    }

    function registerShortcuts() {
        window.addEventListener('keydown', e => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (!e.altKey) return;

            if (e.key === ']') {
                e.preventDefault();
                changeRate(0.25);
            } else if (e.key === '[') {
                e.preventDefault();
                changeRate(-0.25);
            } else if (e.key === '\\') {
                e.preventDefault();
                applyRate(1);
            }
        }, true);
    }

    function registerMenu() {
        if (typeof GM_registerMenuCommand !== 'function') return;

        GM_registerMenuCommand('设置 B站播放倍速', () => {
            const value = prompt(`请输入播放倍速，范围 ${MIN_RATE} - ${MAX_RATE}`, String(currentRate));
            if (value === null) return;
            applyRate(Number(value));
        });

        GM_registerMenuCommand('切换锁定倍速', () => {
            lockRate = !lockRate;
            localStorage.setItem(STORAGE_LOCK, String(lockRate));
            updatePanel();
            if (lockRate) applyRate(currentRate, false);
            alert(`锁定倍速：${lockRate ? '已开启' : '已关闭'}`);
        });

        GM_registerMenuCommand('展开/缩小倍速悬浮窗', () => {
            setCollapsed(!collapsed);
        });
    }

    function init() {
        createPanel();
        registerShortcuts();
        registerMenu();

        const observer = new MutationObserver(() => {
            const video = findMainVideo();
            if (video) attachVideo(video);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setInterval(() => {
            const video = findMainVideo();
            if (video) attachVideo(video);

            // 保守处理：只在定时器里尝试插入播放器原生时间栏，不放进 MutationObserver
            insertNativeRemainingSafely();

            if (lockRate && video && Math.abs(video.playbackRate - currentRate) > 0.001) {
                applyRate(currentRate, false);
            }

            updateRemainingInfo();
        }, 1000);

        setTimeout(() => {
            applyRate(currentRate, false);
            insertNativeRemainingSafely();
            updateRemainingInfo();
        }, 1000);
    }

    if (document.body) {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
