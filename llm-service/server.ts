import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';

app.listen(port as number, host, () => {
  console.log(`[llm-service] running at http://${host}:${port}`);
});
