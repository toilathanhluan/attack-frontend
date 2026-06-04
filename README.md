# Secure API Attack Frontend

Frontend nay dung de tao cac kich ban client tan cong co kiem soat vao he thong Secure API Gateway.

## Luong demo moi

```text
Attack Frontend -> API Gateway -> nhan HTTP status tai cho
Server/Kong -> ghi log chan request tren may server
```

Attack Frontend khong tu redirect ve Server UI nua. Khi bam kich ban tan cong, trang se hien:

- HTTP status
- ket qua allowed/blocked/error/warning
- layer bi chan
- request id
- message tu kich ban demo

## Cau hinh 2 may

Tao file `.env` tren may chay attack frontend:

```env
VITE_API_BASE_URL=https://192.168.1.10:8443
VITE_SERVER_UI_URL=http://192.168.1.10:5173
```

Trong do `192.168.1.10` la IP LAN cua may server. Khong dung `localhost` tren may attack, vi `localhost` se tro ve chinh may attack.

Neu da co domain:

```env
VITE_API_BASE_URL=https://api.tenmiencuaban.com
VITE_SERVER_UI_URL=https://server.tenmiencuaban.com
```

## Chay local

```bash
npm install
npm run dev
```

Mo URL Vite hien ra tren may attack, vi du:

```text
http://192.168.1.20:5173
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
