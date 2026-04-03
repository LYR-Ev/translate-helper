# 划词翻译小能手

基于 Manifest V3 的浏览器扩展：在网页上**选中文字**后，在鼠标附近弹出一张小卡片，展示原文与翻译区域

## 功能

1.0.0版本：

- 在任意页面划词（鼠标松开 `mouseup`）后弹出浮层
- 显示**原文**，**翻译**栏（目前为演示用固定文案）
- 点击 **X** 关闭弹窗；再次划词会替换旧弹窗

## 安装（Chrome / Edge 等 Chromium 内核）

1. 打开浏览器扩展管理页：  
   - Chrome：`chrome://extensions/`  
   - Edge：`edge://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本仓库根目录（包含 `manifest.json` 的文件夹）

## 项目结构

 -`manifest.json`  扩展配置（MV3、内容脚本匹配 `<all_urls>`）。
 -`content.js`  内容脚本：监听选区、创建/定位弹窗、关闭按钮 。
 -`style.css` 弹窗与头部、正文、关闭按钮样式。

## 技术说明

- **内容脚本**注入到匹配的页面，可直接操作 DOM，无法直接访问大部分 `chrome.*` API（当前未声明额外权限）。
- 弹窗使用 `position: absolute` 与脚本设置的 `left` / `top`（相对页面坐标 `pageX` / `pageY`），并配合较高 `z-index` 避免被页面遮挡。

## 后续可扩展

- 将「翻译」一行改为调用翻译 API（通常需要 `background`/`service worker` 或合规的主机权限，以避免在内容脚本里暴露密钥）
- 防抖、忽略在输入框内的选区、点击空白处关闭等交互优化 

## 问题及解决

1.弹窗位置出现问题，一直在占据整个侧栏

解决：
manifest.json文件css应小写

2.不能实时划线翻译

解决：
content.js中弹窗类名误写为translation-popup

3.点击关闭按钮弹窗消失后又立即弹出

解决：
新增统一抑制函数：isAutoOpenSuppressed()，关闭按钮不只 click，还在 pointerdown / mousedown 提前开启 500ms 抑制
scheduleTrigger() 前后都加抑制判断（防止已排队任务执行）
triggerTranslatePopup() 开头加抑制判断
selectionchange / pointerup / mouseup / keyup / mousedown 全部加抑制判断
closePopupAndSuppressReopen() 抑制时间改为 500ms（更稳）

仍未解决：
const fresh = readSelection();
if (fresh.text) {
    latestSelectedText = fresh.text;
    latestSelectionRect = fresh.rect;
}
latestSelectedText 不会被更新为空字符串
它还保留着上一次选中的旧文本！

4.API额度用光

解决：写自己的翻译后端

5.在 content.js 里直接请求本地后端
内容脚本在很多站点会遇到跨域/CORS/页面安全策略问题，导致 fetch 失败。