import { defineAsyncComponent } from 'vue';

export const createAsyncMissionComponent = (loader) =>
  defineAsyncComponent({
    loader,
    delay: 120,
    timeout: 30000,
    suspensible: false,
  });
