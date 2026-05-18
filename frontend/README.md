# TanlaAI Frontend React

Bu katalog TanlaAI'ning React frontend qismi.

## Texnologiyalar

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Axios

## Development

```bash
cd /Users/ogabek/Documents/projects/tanlaAI/frontend-react
npm install
npm run dev
```

Vite dev server:

- `http://127.0.0.1:5173`

Proxy sozlamalari:

- `/api/v1` -> Django backend
- `/media` -> Django backend

## Build

```bash
cd /Users/ogabek/Documents/projects/tanlaAI/frontend-react
npm run build
```

Build chiqishi:

- `../backend/static/react/index.html`
- `../backend/static/react/assets/*`

Build paytida Vite `base=/static/react/` bilan ishlaydi, shuning uchun Django SPA sahifalari assetlarni to'g'ri yuklaydi.

## Lint

```bash
npm run lint
```

## Asosiy Sahifalar

- `HomePage`
- `SearchPage`
- `LeadersPage`
- `DiscountsPage`
- `ProfilePage`
- `WishlistPage`
- `ProductDetailPage`
- `AIVisualizePage`
- `CompanyDetailPage`
- `CompanyEditPage`
- `ProductFormPage`
- `CreatorDashboard`

## Eslatma

- API base URL default holatda `/api/v1`
- Agar kerak bo'lsa `VITE_API_URL` bilan override qilish mumkin
- Productionda Vercel uchun `VITE_API_URL=https://tanla-ai.ardentsoft.uz/api/v1` ishlating
- `VITE_BACKEND_ORIGIN` berilsa, frontend productionda shu origin asosida API manzilini yig'adi
- `vercel.json` SPA route'larni `/index.html` ga rewrite qiladi
- Legacy route aliaslar React router ichida saqlangan
