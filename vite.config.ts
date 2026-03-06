import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills' // 👈 必须有这个

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), // 👈 必须启用
  ],
  resolve: {
    alias: {
      "ethers": "ethers", // 确保指向 v5
      // "ethers/lib/utils": "ethers" // 既然降级到了 v5，这行其实可以删掉了，不过留着也无害
    },
  },
})
