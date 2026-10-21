import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.on('connect', () => {
    console.log('Berhasil terhubung ke Redis');
});
redisClient.on('error', (err) => {
    console.error('Terjadi kesalahan pada Redis:', err);
});
export const connectRedis = async () => {
    try {
        await redisClient.connect();
    }
    catch (error) {
        console.error('Gagal terhubung ke Redis:', error);
    }
};
export default redisClient;
