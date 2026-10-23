# 🏛️ Sistema Digital de Secretaria e Balaústres Maçônicos (Multi-Tenant)

Sistema web completo para lavratura litúrgica, arquivo histórico e impressão de Balaústres (Atas Maçônicas) com suporte Multi-Lojas (Multi-Tenant), integrado ao **Supabase (PostgreSQL + Storage)**.

---

## 🚀 Como instalar no EasyPanel via GitHub

Este repositório (`https://github.com/maxudi/secretaria.git`) já possui `Dockerfile` e `nginx.conf` configurados na porta **80** (padrão do EasyPanel).

### Passo a passo no EasyPanel:
1. No seu painel do **EasyPanel**, entre no seu Projeto e clique em **"+ Service" → "App"**.
2. Dê um nome ao serviço (ex: `secretaria`).
3. Na aba **Source** (Origem), selecione **GitHub** (ou **Git**):
   - **Repository / URL:** `https://github.com/maxudi/secretaria.git`
   - **Branch:** `main`
   - **Build Path:** `/`
4. Na aba **Build**, selecione **Dockerfile** (`Dockerfile`).
5. *(Opcional)* Na aba **Environment**, caso deseje sobrescrever as variáveis do Supabase:
   ```env
   VITE_SUPABASE_URL=https://lnharsdbknxwpjcfsahd.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_DGa55H4tMOmS1TZQZ_ZIOw_NMAciObX
   VITE_DEFAULT_LOJA_ID=00000000-0000-0000-0000-000000003402
   ```
   *(Marque a opção **"Create .env file"** / **"Pass as build arguments"** se quiser alterá-las no futuro).*
6. Na aba **Domains**, configure o seu domínio/subdomínio e garanta que a porta interna do container seja **`80`**.
7. Clique em **Deploy**!

---

## 💻 Desenvolvimento Local

```bash
npm install
npm run dev
```

Para gerar o build de produção:
```bash
npm run build
```
