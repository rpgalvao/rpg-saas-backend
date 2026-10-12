FROM node:20-alpine

WORKDIR /app

# 1. Instala o Chromium e dependências nativas do Alpine para gerar PDFs
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 2. Informa ao Puppeteer para usar o Chromium instalado acima
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta padrão que estamos usando
EXPOSE 3333

# Comando para iniciar o servidor em modo de desenvolvimento
CMD ["npm", "run", "dev"]