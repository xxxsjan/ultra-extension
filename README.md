# translate-ultra

自制翻译插件

## 使用

### 安装依赖

pnpm i

### 打包项目

npm run build
根目录会生成build/chrome-mv3-prod

### 浏览器使用插件

#### 生产环境

浏览器进入扩展程序管理

点击加载已解压

选择文件夹build/chrome-mv3-prod

#### 开发环境

npm run dev

根目录会生成build/chrome-mv3-dev

加载已解压时选择build/chrome-mv3-dev

这样可以热更新调试

### 参考文章

[谷歌插件官方文档](https://developer.chrome.com/docs/extensions/reference/)

<https://blog.csdn.net/Jioho_chen/article/details/126672461>

<https://blog.csdn.net/ByteDanceTech/article/details/126113100>
