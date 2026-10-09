FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta padrão que estamos usando
EXPOSE 3333

# Comando para iniciar o servidor em modo de desenvolvimento
CMD ["npm", "run", "dev"]