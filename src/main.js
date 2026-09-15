import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
// 尽早安装全局错误捕获（window.onerror / unhandledrejection）
import './utils/debugLogger.js';

createApp(App).mount('#app');
