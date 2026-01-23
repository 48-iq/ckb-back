FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./


RUN npm install

COPY . .

ENV NEO4J_server_jvm_additional=--add-modules=jdk.incubator.vector
ENV NEO4J_dbms_index_vector_enabled="true"

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]