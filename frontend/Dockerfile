
FROM node:lts-alpine

WORKDIR /app

#copy package ก่อน เพื่อ cache
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]