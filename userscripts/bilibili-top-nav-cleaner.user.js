// ==UserScript==
// @name         B站顶部导航精简
// @name:en      Bilibili Top Navigation Cleaner
// @namespace    https://github.com/bufayadexiaotudou/
// @version      1.2.0
// @description  从“下载客户端”开始向左隐藏 1～7 个顶部导航项，并可选择让搜索栏保持居中。
// @description:en Hide 1–7 top navigation items starting from “Download Client”, with an optional centered search bar.
// @author       bufayadexiaotudou
// @match        https://www.bilibili.com/*
// @match        https://*.bilibili.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @noframes
// @downloadURL  https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-top-nav-cleaner.user.js
// @updateURL    https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-top-nav-cleaner.user.js
// ==/UserScript==

(() => {
    'use strict';

    // 防止在 iframe 中重复执行
    if (window.top !== window.self) return;

    const HIDE_CLASS = 'tm-hide-bili-top-nav-entry';
    const CENTER_CLASS = 'tm-bili-search-centered';

    const HIDE_COUNT_KEY = 'biliTopNavHideCount';
    const CENTER_SEARCH_KEY = 'biliTopNavCenterSearch';

    const DEFAULT_HIDE_COUNT = 2;
    const DEFAULT_CENTER_SEARCH = true;

    let hideCountMenuId = null;
    let centerSearchMenuId = null;
    let scheduled = false;

    GM_addStyle(`
        /* 隐藏顶部导航项 */
        .${HIDE_CLASS} {
            display: none !important;
        }

        /*
         * 搜索栏居中模式。
         * 使用绝对定位，使左侧导航项减少后，
         * 搜索栏仍然位于整个浏览器窗口的中央。
         */
        html.${CENTER_CLASS} .bili-header__bar {
            position: relative !important;
        }

        html.${CENTER_CLASS} .bili-header .center-search-container,
        html.${CENTER_CLASS} #biliMainHeader .center-search-container {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            right: auto !important;

            width: clamp(260px, 32vw, 500px) !important;
            max-width: 500px !important;

            margin: 0 !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2 !important;
        }
    `);

    /**
     * 获取需要隐藏的导航项数量。
     */
    function getHideCount() {
        const value = Number(
            GM_getValue(HIDE_COUNT_KEY, DEFAULT_HIDE_COUNT)
        );

        if (
            Number.isInteger(value) &&
            value >= 1 &&
            value <= 7
        ) {
            return value;
        }

        GM_setValue(HIDE_COUNT_KEY, DEFAULT_HIDE_COUNT);
        return DEFAULT_HIDE_COUNT;
    }

    /**
     * 获取搜索栏居中设置。
     */
    function getCenterSearchEnabled() {
        return Boolean(
            GM_getValue(
                CENTER_SEARCH_KEY,
                DEFAULT_CENTER_SEARCH
            )
        );
    }

    /**
     * 获取导航入口最外层元素。
     */
    function getNavItem(element) {
        if (!element) return null;

        return element.closest(
            '.left-entry > li, .left-entry li, li'
        ) || element;
    }

    /**
     * 查找“下载客户端”所在的导航项。
     */
    function findDownloadItem(leftEntry) {
        // 优先根据 B 站现有类名查找
        const byClass = leftEntry.querySelector(
            '.download-entry'
        );

        if (byClass) {
            return getNavItem(byClass);
        }

        // 类名变化时，根据文字兜底
        const directChildren = Array.from(
            leftEntry.children
        );

        const byText = directChildren.find(element => {
            const text = element.textContent
                .replace(/\s+/g, '')
                .trim();

            return text.includes('下载客户端');
        });

        return getNavItem(byText);
    }

    /**
     * 应用导航项隐藏设置。
     */
    function applyHiddenEntries() {
        // 先清除旧状态，避免从 7 改成 2 后仍多隐藏 5 项
        document
            .querySelectorAll(`.${HIDE_CLASS}`)
            .forEach(element => {
                element.classList.remove(HIDE_CLASS);
            });

        const hideCount = getHideCount();
        const leftEntries = document.querySelectorAll(
            '.left-entry'
        );

        for (const leftEntry of leftEntries) {
            let currentItem = findDownloadItem(leftEntry);

            // 从“下载客户端”开始向左隐藏
            for (
                let index = 0;
                index < hideCount && currentItem;
                index++
            ) {
                currentItem.classList.add(HIDE_CLASS);
                currentItem = currentItem.previousElementSibling;
            }
        }
    }

    /**
     * 应用搜索栏居中设置。
     */
    function applySearchCenterSetting() {
        document.documentElement.classList.toggle(
            CENTER_CLASS,
            getCenterSearchEnabled()
        );
    }

    /**
     * 应用所有设置。
     */
    function applySettings() {
        applyHiddenEntries();
        applySearchCenterSetting();
    }

    /**
     * 重新注册油猴菜单，使菜单文字显示最新状态。
     */
    function registerMenus() {
        if (hideCountMenuId !== null) {
            GM_unregisterMenuCommand(hideCountMenuId);
        }

        if (centerSearchMenuId !== null) {
            GM_unregisterMenuCommand(centerSearchMenuId);
        }

        hideCountMenuId = GM_registerMenuCommand(
            `⚙ 隐藏顶部导航项：${getHideCount()} 个`,
            () => {
                const currentValue = getHideCount();

                const input = window.prompt(
                    [
                        '请输入要隐藏的顶部导航项数量：',
                        '',
                        '范围：1～7',
                        `当前设置：${currentValue}`,
                        '',
                        '从“下载客户端”开始向左计算。'
                    ].join('\n'),
                    String(currentValue)
                );

                if (input === null) return;

                const trimmedInput = input.trim();

                if (!/^[1-7]$/.test(trimmedInput)) {
                    window.alert(
                        '请输入 1～7 之间的整数。'
                    );
                    return;
                }

                GM_setValue(
                    HIDE_COUNT_KEY,
                    Number(trimmedInput)
                );

                applySettings();
                registerMenus();
            }
        );

        const centerStatus = getCenterSearchEnabled()
            ? '已开启'
            : '已关闭';

        centerSearchMenuId = GM_registerMenuCommand(
            `⚙ 搜索栏居中：${centerStatus}（点击切换）`,
            () => {
                GM_setValue(
                    CENTER_SEARCH_KEY,
                    !getCenterSearchEnabled()
                );

                applySearchCenterSetting();
                registerMenus();
            }
        );
    }

    /**
     * 合并短时间内的大量页面变化。
     */
    function scheduleApply() {
        if (scheduled) return;

        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            applySettings();
        });
    }

    function start() {
        applySettings();
        registerMenus();

        // B 站可能动态重建顶部导航
        const observer = new MutationObserver(
            scheduleApply
        );

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener(
            'pageshow',
            scheduleApply
        );

        document.addEventListener(
            'readystatechange',
            scheduleApply
        );
    }

    if (document.documentElement) {
        start();
    } else {
        document.addEventListener(
            'DOMContentLoaded',
            start,
            { once: true }
        );
    }
})();
