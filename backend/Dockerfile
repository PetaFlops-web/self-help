FROM node:20-alpine

ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


CMD ["npm", "run", "start"]