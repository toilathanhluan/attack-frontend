# Secure API Attack Frontend

Frontend nay dung de tao cac kich ban client tan cong co kiem soat vao he thong Secure API Gateway.

Luồng demo:

```text
Attack Frontend -> API Gateway -> nhan status -> redirect Server UI
```

## Cau hinh

Tao `.env`:

```env
VITE_API_BASE_URL=https://api.tenmiencuaban.com
VITE_SERVER_UI_URL=https://server.tenmiencuaban.com
```

Neu chua co domain:

```env
VITE_API_BASE_URL=https://20.214.159.58:8443
VITE_SERVER_UI_URL=https://server-ui.vercel.app
```

## Chay local

```bash
npm install
npm run dev
```

## Deploy Vercel

Import repo rieng nay vao Vercel:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

Them environment variables:

```text
VITE_API_BASE_URL
VITE_SERVER_UI_URL
```
