# Userscripts / 油猴脚本

一组自己日常使用、顺手整理并公开分享的浏览器用户脚本。当前主要面向 **Tampermonkey**，也可尝试在兼容 Userscript API 的脚本管理器中使用。

A small collection of browser userscripts created for everyday use and shared publicly. They are primarily tested with **Tampermonkey**, and may also work with other userscript managers that support compatible APIs.

---

## 中文

### 脚本列表

| 脚本 | 版本 | 功能 |
| --- | --- | --- |
| [B站顶部导航精简](userscripts/bilibili-top-nav-cleaner.user.js) | 1.2.0 | 从“下载客户端”开始向左隐藏 1～7 个顶部导航项，并可让搜索栏保持页面居中 |
| [Bilibili 自定义播放倍速](userscripts/bilibili-custom-playback-speed.user.js) | 1.3.1 | 0.25x～3x 自定义倍速、倍速锁定、快捷键、悬浮窗及当前倍速下剩余观看时间 |

### 1. B站顶部导航精简

适用于 `bilibili.com`。

主要功能：

- 默认隐藏“下载客户端”以及它左侧紧邻的滚动推广位。
- 可在油猴菜单中把隐藏数量调整为 **1～7 个**。
- 隐藏数量较多时，可选择强制让搜索栏保持页面居中。
- 设置会自动保存。
- 监听页面动态变化，兼容 B 站站内无刷新切换和导航栏重新渲染。
- 使用 `@noframes` 并额外检查顶层窗口，避免 iframe 重复注册菜单。
- 不提供悬浮窗，设置全部放在 Tampermonkey 菜单中。

**直接安装：**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-top-nav-cleaner.user.js

### 2. Bilibili 自定义播放倍速

适用于 B 站普通视频、番剧播放页和列表播放页。

主要功能：

- 支持 **0.25x～3.0x** 自定义播放倍速，步进为 0.05。
- 提供 1x、1.25x、1.5x、2x、2.5x、3x 快速按钮。
- 可锁定当前倍速，防止播放器自动把速度改回去。
- 倍速、锁定状态和悬浮窗收起状态会自动保存。
- 显示当前倍速下的**预计剩余观看时间**。
- 会尝试在 B 站播放器原生时间区域旁显示剩余时间。
- 提供悬浮控制面板，可缩小成页面右侧的小圆点。
- 快捷键：`Alt + [` 降速、`Alt + ]` 加速、`Alt + \` 恢复 1x。
- 同时提供 Tampermonkey 菜单项用于设置倍速、切换倍速锁定以及展开/缩小悬浮窗。
- 监听页面动态变化，适应 B 站切集、换 P、播放器重新创建等场景。

**直接安装：**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-custom-playback-speed.user.js

### 安装方法

1. 安装 Tampermonkey。
2. 点击上面的对应脚本“直接安装”链接。
3. Tampermonkey 打开安装页面后确认安装。
4. 打开 Bilibili 即可使用。

也可以在 Tampermonkey 中新建脚本，然后把仓库中的 `.user.js` 内容完整复制进去。

### 注意事项

- 网站前端结构可能随时修改。如果页面改版导致脚本失效，请提交 Issue，并尽量附上页面地址、现象和浏览器版本。
- 自定义倍速超过 B 站界面原生提供的范围时，脚本是直接设置 HTML5 `video.playbackRate`；实际效果仍受浏览器和具体媒体播放实现限制。
- 建议使用较新的 Chromium 浏览器和 Tampermonkey 版本。

### 贡献

欢迎提交 Issue、改进建议或 Pull Request。若网站改版造成选择器失效，也欢迎直接提交修复。

### 许可证

本项目采用 [MIT License](LICENSE)。

---

## English

### Scripts

| Script | Version | What it does |
| --- | --- | --- |
| [Bilibili Top Navigation Cleaner](userscripts/bilibili-top-nav-cleaner.user.js) | 1.2.0 | Hides 1–7 top navigation items starting from “Download Client”, with an optional centered search bar |
| [Bilibili Custom Playback Speed](userscripts/bilibili-custom-playback-speed.user.js) | 1.3.1 | Custom 0.25x–3x playback speed, speed lock, shortcuts, floating panel, and remaining watch time |

### 1. Bilibili Top Navigation Cleaner

For `bilibili.com`.

Features:

- By default hides the “Download Client” entry and the rotating promotional entry immediately to its left.
- Lets you choose **1–7** navigation items to hide from the Tampermonkey menu.
- Can keep the search bar centered even when many left-side items are hidden.
- Saves settings automatically.
- Watches dynamic DOM updates so it keeps working across Bilibili's client-side navigation and header re-renders.
- Uses `@noframes` plus a top-window check to avoid duplicate menu registration inside iframes.
- No floating UI; configuration stays inside the userscript manager menu.

**Direct install:**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-top-nav-cleaner.user.js

### 2. Bilibili Custom Playback Speed

For normal Bilibili video pages, bangumi playback pages, and list playback pages.

Features:

- Custom playback speed from **0.25x to 3.0x** in 0.05 steps.
- Quick buttons for 1x, 1.25x, 1.5x, 2x, 2.5x, and 3x.
- Optional speed lock to prevent the player from resetting the selected playback rate.
- Saves playback rate, lock state, and panel collapsed state.
- Shows the estimated **remaining watch time at the current playback speed**.
- Attempts to display remaining time next to Bilibili's native player time indicator.
- Provides a floating control panel that can collapse into a small dot on the right edge of the page.
- Shortcuts: `Alt + [` to slow down, `Alt + ]` to speed up, and `Alt + \` to reset to 1x.
- Tampermonkey menu commands are also available for setting playback rate, toggling the speed lock, and expanding/collapsing the panel.
- Watches dynamic DOM changes so it can recover after switching episodes/parts or when Bilibili recreates the player.

**Direct install:**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/bilibili-custom-playback-speed.user.js

### Installation

1. Install Tampermonkey.
2. Open the direct-install link for the script you want.
3. Confirm installation in Tampermonkey.
4. Open Bilibili.

Alternatively, create a new userscript manually and paste the complete contents of the corresponding `.user.js` file.

### Notes

- Website DOM structures can change at any time. If a site update breaks a script, please open an Issue and include the affected URL, symptoms, browser version, and any useful screenshots or console errors.
- Playback rates beyond Bilibili's own UI range are applied directly through the HTML5 `video.playbackRate` property; actual behavior can still depend on the browser and media implementation.
- A recent Chromium-based browser and Tampermonkey version are recommended.

### Contributing

Issues, improvements, and pull requests are welcome. Fixes for broken selectors after website redesigns are especially useful.

### License

This project is licensed under the [MIT License](LICENSE).
