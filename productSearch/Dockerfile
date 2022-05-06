FROM node:current-alpine3.14

WORKDIR /usr/app/src

COPY package*.json ./
COPY . .

RUN npm install

EXPOSE 3001
CMD ["node", "app.js"]