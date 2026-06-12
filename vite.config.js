import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 地图服务请求代理，方便在终端查看日志
      '/map': {
        target: 'http://25.11.1.178:28001',
        changeOrigin: true,
      },
      // API 请求代理，解决开发环境跨域问题
      '/api': {
        target: 'http://25.11.1.222:28600',
        changeOrigin: true,
      },
    },
  },
});
