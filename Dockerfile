FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY src ./src
COPY config ./config
COPY  tsconfig.json ./tsconfig.json

EXPOSE 3200

ENTRYPOINT ["npm", "run", "start"]
