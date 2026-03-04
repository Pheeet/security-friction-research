
FROM node:lts-alpine

WORKDIR /app

#copy package ก่อน เพื่อ cache
COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npm cache clean --force

EXPOSE 3000

CMD ["npm", "run", "dev"]