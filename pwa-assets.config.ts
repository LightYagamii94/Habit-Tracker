import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

const background = { background: '#09090b' };

export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: background },
    apple: { ...preset.apple, resizeOptions: background },
  },
  images: ['public/icon.svg'],
});
