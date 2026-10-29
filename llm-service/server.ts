import { config } from './src/config/env.js';
import app from './app.js';

app.listen(config.port, config.host, () => {
  console.log(`[llm-service] running in ${config.nodeEnv} mode at http://${config.host}:${config.port}`);
});
