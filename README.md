# Kalyankar Batteries — React Admin Dashboard

A React (Vite) conversion of the original static HTML admin dashboard.
All 8 pages, tables, add-record modals, search/filter, and charts have
been rebuilt as React components with the same look and behavior.

## Structure

```
kalyankar-react/
├── index.html                 Vite entry HTML (Bootstrap + FontAwesome via CDN)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                React root + router
    ├── App.jsx                 Route definitions
    ├── index.css                Global styles (from the original style.css)
    ├── assets/
    │   └── logo.png
    ├── components/
    │   ├── Layout.jsx           Sidebar + <Outlet /> wrapper
    │   ├── Sidebar.jsx           Nav with active-route highlighting
    │   ├── Topbar.jsx            Page title + live date + admin badge
    │   └── useChart.js           Small Chart.js hook used by Dashboard/Reports
    └── pages/
        ├── Dashboard.jsx
        ├── Products.jsx
        ├── Sales.jsx
        ├── Customers.jsx
        ├── Inventory.jsx
        ├── Warranty.jsx
        ├── Reports.jsx
        └── Settings.jsx
```

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
```

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Notes

- **Routing** uses `react-router-dom` — each old `.html` page is now a route
  (`/`, `/products`, `/sales`, `/customers`, `/inventory`, `/warranty`,
  `/reports`, `/settings`) instead of a separate file.
- **State** (products, sales, customers, inventory, warranty records) lives in
  React `useState` per page, matching the original in-memory/DOM behavior —
  adding a record, searching, and the summary cards all update live.
  Refreshing the page resets to the seed data, same as the original (nothing
  was persisted server-side before, either).
- **Modals** still use Bootstrap's data attributes (`data-bs-toggle`,
  `data-bs-target`) and the Bootstrap JS bundle loaded via CDN in
  `index.html`, so no extra modal library was introduced.
- **Charts** use `chart.js` directly through a tiny `useChart` hook that
  creates the chart on mount and destroys it on unmount/re-render.
- To connect this to a real backend, replace the `useState` seed arrays in
  each page with data fetched from your API (e.g. the `kalyankar_batteries.sql`
  schema provided earlier), and wire the form submit handlers to POST/PUT
  requests instead of local array updates.
