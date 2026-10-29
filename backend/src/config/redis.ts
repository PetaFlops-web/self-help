import { createClient } from 'redis';
import { config } from './env.js';

const redisClient = createClient({
    url: config.redisUrl,
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
    } catch (error) {
        console.error('Gagal terhubung ke Redis:', error);
    }
};

export default redisClient;