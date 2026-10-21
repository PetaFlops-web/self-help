import dotenv from 'dotenv';
import app from './app.js';
import { connectRedis } from './src/config/redis.js';

dotenv.config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

connectRedis().then(() => {
    app.listen(port as number, host, () => {
        console.log(`Server is running at http://${host}:${port}`);
    });
});