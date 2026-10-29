// env.ts harus di-import pertama agar dotenv.config() jalan sebelum modul lain
import { config } from './src/config/env.js';
import app from './app.js';
import { connectRedis } from './src/config/redis.js';
connectRedis().then(() => {
    app.listen(config.port, config.host, () => {
        console.log(`Server running in ${config.nodeEnv} mode at http://${config.host}:${config.port}`);
    });
});
