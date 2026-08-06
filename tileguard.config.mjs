import { tilePlugin } from './packages/tile-rules/dist/index.js';
import { stylePlugin } from './packages/style-rules/dist/index.js';

const config = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    // Customize rule severities and options here.
  },
  reporter: 'text',
};

export default config;
