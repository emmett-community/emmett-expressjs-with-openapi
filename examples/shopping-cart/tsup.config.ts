import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/handlers/shoppingCarts.ts'],
  format: ['esm'],
  target: 'es2022',
  platform: 'node',
  splitting: false,
  outDir: 'dist',
  clean: true,
  tsconfig: 'tsconfig.json',
});
