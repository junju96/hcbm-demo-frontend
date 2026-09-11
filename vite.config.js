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
      // 态势池接口代理（更具体，需放在 /api 之前）
      '/api/v1/situation_pool': {
        target: 'http://25.11.1.178:28802',
        changeOrigin: true,
      },
      // 空地车空中侦察规划接口代理（部署在 25.11.1.178）
      '/air-recon': {
        target: 'http://25.11.1.178:28505',
        changeOrigin: true,
      },
      // 用户服务代理（/user/current 等）
      '/user': {
        target: 'http://25.11.1.178:28009',
        changeOrigin: true,
      },
      // 车辆信息服务代理（/vehicle/info/all 等）
      '/vehicle': {
        target: 'http://25.11.1.3:28410',
        changeOrigin: true,
      },
      // API 请求代理，解决开发环境跨域问题
      '/api': {
        target: 'http://localhost:28600',
        changeOrigin: true,
      },
    },
  },
});
