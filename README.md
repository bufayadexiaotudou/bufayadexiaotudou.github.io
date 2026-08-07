# Userscripts / 油猴脚本

一组自己日常使用、顺手整理并公开分享的浏览器用户脚本。当前主要面向 **Tampermonkey**，也可尝试在兼容 Userscript API 的脚本管理器中使用。

A small collection of browser userscripts created for everyday use and shared publicly. They are primarily tested with **Tampermonkey**, and may also work with other userscript managers that support compatible APIs.

---

## 中文

### 脚本列表

| 脚本 | 版本 | 功能 |
| --- | --- | --- |
| [B站顶部导航精简](userscripts/bilibili-top-nav-cleaner.user.js) | 1.2.0 | 从“下载客户端”开始向左隐藏 1～7 个顶部导航项，并可让搜索栏保持页面居中 |
| [国家中小学智慧教育平台 - 2倍速自动连播](userscripts/smartedu-auto-playlist.user.js) | 1.0.0 | 自动设为 2 倍速，播放结束自动切换下一视频，并提供可拖动、可收起的控制面板 |

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

### 2. 国家中小学智慧教育平台 - 2倍速自动连播

适用于国家中小学智慧教育平台教师培训课程详情页。

主要功能：

- 自动把视频播放速度保持在 **2.0×**。
- 当前视频播放结束后自动切换到下一视频。
- 当前章节结束后自动进入下一章节。
- 提供“暂停/开启自动连播”“从第一节开始”“立即下一节”等操作。
- 显示当前视频、播放进度和运行状态。
- 控制面板支持拖动和收起。
- 监听页面动态加载，并在播放器被重新创建后重新绑定。
- 如果浏览器阻止自动播放，会提示手动点击一次播放。

**直接安装：**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/smartedu-auto-playlist.user.js

### 安装方法

1. 安装 Tampermonkey。
2. 点击上面的对应脚本“直接安装”链接。
3. Tampermonkey 打开安装页面后确认安装。
4. 打开对应网站即可使用。

也可以在 Tampermonkey 中新建脚本，然后把仓库中的 `.user.js` 内容完整复制进去。

### 注意事项

- 网站前端结构可能随时修改。如果页面改版导致脚本失效，请提交 Issue，并尽量附上页面地址、现象和浏览器版本。
- 智慧教育平台脚本只自动控制网页播放器的倍速、播放和课程目录切换，不用于绕过账号权限、验证机制或平台本身的访问限制。使用时请遵守目标网站的规则和服务条款。
- 建议使用较新的 Chromium 浏览器和 Tampermonkey 版本。

### 贡献

欢迎提交 Issue、改进建议或 Pull Request。若网站改版造成选择器失效，也欢迎直接提交修复。

---

## English

### Scripts

| Script | Version | What it does |
| --- | --- | --- |
| [Bilibili Top Navigation Cleaner](userscripts/bilibili-top-nav-cleaner.user.js) | 1.2.0 | Hides 1–7 top navigation items starting from “Download Client”, with an optional centered search bar |
| [SmartEdu - 2x Auto Playlist](userscripts/smartedu-auto-playlist.user.js) | 1.0.0 | Forces 2x playback, automatically advances to the next video, and provides a movable/collapsible control panel |

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

### 2. SmartEdu - 2x Auto Playlist

For teacher-training course detail pages on China's National Smart Education Platform for Primary and Secondary Schools.

Features:

- Keeps video playback at **2.0×**.
- Automatically advances when the current video ends.
- Moves to the next section when the current section is finished.
- Provides controls for enabling/disabling autoplay, starting from the first lesson, and skipping to the next lesson immediately.
- Shows the current item, playback progress, and status.
- The control panel is draggable and collapsible.
- Rebinds automatically when the site dynamically recreates the video player.
- Shows a message if browser autoplay policy requires one manual play action first.

**Direct install:**  
https://raw.githubusercontent.com/bufayadexiaotudou/bufayadexiaotudou.github.io/main/userscripts/smartedu-auto-playlist.user.js

### Installation

1. Install Tampermonkey.
2. Open the direct-install link for the script you want.
3. Confirm installation in Tampermonkey.
4. Open the supported website.

Alternatively, create a new userscript manually and paste the complete contents of the corresponding `.user.js` file.

### Notes

- Website DOM structures can change at any time. If a site update breaks a script, please open an Issue and include the affected URL, symptoms, browser version, and any useful screenshots or console errors.
- The SmartEdu script only automates normal browser-side playback speed, play/advance behavior, and course-list navigation. It does not bypass account permissions, verification mechanisms, or access controls. Please follow the target site's rules and terms of service.
- A recent Chromium-based browser and Tampermonkey version are recommended.

### Contributing

Issues, improvements, and pull requests are welcome. Fixes for broken selectors after website redesigns are especially useful.
