# ============================================================================
# ETAPA 1: Build da Aplicação React + TypeScript + Vite
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Variáveis de ambiente opcionais em tempo de build no EasyPanel
ARG VITE_SUPABASE_URL=https://lnharsdbknxwpjcfsahd.supabase.co
ARG VITE_SUPABASE_ANON_KEY=sb_publishable_DGa55H4tMOmS1TZQZ_ZIOw_NMAciObX
ARG VITE_DEFAULT_LOJA_ID=00000000-0000-0000-0000-000000003402

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_DEFAULT_LOJA_ID=$VITE_DEFAULT_LOJA_ID

# Instala dependências aproveitando cache de camadas
COPY package.json package-lock.json* ./
RUN npm install

# Copia código-fonte e gera o bundle estático de produção
COPY . .
RUN npm run build

# ============================================================================
# ETAPA 2: Servidor Web Nginx de Produção (Porta 80 padrão do EasyPanel)
# ============================================================================
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

