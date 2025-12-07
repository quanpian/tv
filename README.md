<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18AErm3q4nDJg8bIUiCXSoqX85XSX4YIy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


方案一：使用 Cloudflare Pages (推荐，最简单)
这是最现代、免费且高性能的部署方式。不需要自己维护服务器。
准备代码库：
将您的所有代码文件（index.html，App.tsx，vite.config.ts，package.json 等）推送到 GitHub 或 GitLab 的一个私有仓库中。
确保您的 package.json 中包含 "build": "vite build" 命令。
配置 Cloudflare Pages：
登录 Cloudflare Dashboard，进入 工人和页面->创建应用程序->连接到 Git。
授权连接您的 GitHub 仓库并选择该项目。
构建设置 (Build settings)：
框架预设: 选择 迅速地或React。
构建命令：npm run build
构建输出目录：分布
环境变量 (Environment variables)：
添加API密钥，值为您的 Gemini API Key（如果在代码中使用了的话）。
解决跨域问题：
代码中目前使用了 corsproxy.io和allorigins.win 等公共代理。在生产环境中，这通常足够用于个人使用。
进阶优化：如果您希望更稳定，可以在 Cloudflare 中创建一个 工人 来专门代理 CMS 接口请求，然后修改 services/vodService.ts中的API_BASE 指向您的 Worker 地址。
方案二：部署在传统 PHP/Nginx 主机 (如 cPanel)
如果您有一个传统的虚拟主机空间。
本地构建：
在您的电脑上安装 Node.js。
在项目根目录运行 npm 安装 安装依赖。
运行 npm run build。这将在 分布 文件夹中生成打包好的 index.html, CSS 和 JS 文件。
上传文件：
将分布文件夹内的所有内容上传到您的网站根目录（例如 public_html）。
配置 Nginx/Apache (重要)：
因为是单页应用 (SPA)，必须配置重写规则，否则刷新页面会报 404。
Apache（.htaccess）：
code
阿帕奇
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
Nginx（nginx.conf）：
code
Nginx
location / {
  try_files $uri $uri/ /index.html;
}
方案三：使用 Vercel 或 Netlify
与 Cloudflare Pages 类似，非常适合 React 项目。
维塞尔：
安装 Vercel CLI 或直接关联 GitHub。
导入项目，Framework Preset 选择 迅速地。
部署即可。
Netlify：
拖拽 分布 文件夹直接部署（手动构建）。
或者关联 GitHub 自动构建。
需要在根目录添加 重定向 文件以支持 SPA 路由：
code
代码
/*  /index.html  200
关键检查点
无论使用哪种方式，部署后请检查：
HTTPS: 确保您的站点启用 HTTPS，否则无法调用 Gemini API 或播放部分加密的 M3U8 流。
混合内容: 由于您的 CMS API (https://caiji.dyttzyapi.com...) 已经是 HTTPS，通常不会有混合内容报错。如果遇到 HTTP 的图片或源，代码中的 wsrv.nl 代理已经处理了这个问题。
API密钥: 确保 Gemini API Key 已正确配置在环境变量中，或者在代码中暂时硬编码（仅限测试，生产环境请务必保护 Key）。
针对当前代码的特别说明
目前的 index.html 包含了一些 Babel Standalone 和 CDN 引用，这主要是为了方便在没有构建工具的环境下直接预览。
为了生产环境的最佳性能，建议进行标准构建：
确保 vite.config.ts 存在并配置正确。
确保index.html 中的脚本引用改为模块化引用（Vite 会自动处理）：
code
HTML
<!-- 开发/构建模式 -->
<script type="module" src="/index.tsx"></script>
而不是目前的 <script type="text/babel" src="index.tsx">。
如果您想直接部署目前的“无构建”版本（即直接把文件丢到服务器就能跑），请确保服务器支持静态文件托管即可，但加载速度会比构建后的版本慢，且对浏览器兼容性要求更高。
