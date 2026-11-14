# @tynoc/analytics

Privacy-friendly Web Analytics for sites deployed on [Tynoc](https://tynoc.com).

- No cookies and no local storage.
- IP addresses are never stored. Visitors are counted with a hash that changes every day.
- Requests go to your own domain (`/_tynoc/insights/*`), so the script is first-party.
- About 1.4 KB gzipped.

## Before you start

1. Open your project in the Tynoc dashboard.
2. Go to **Analytics** and click **Enable**.
3. Redeploy the project. The `/_tynoc/insights/*` routes become active after the next deployment.

## Install

```bash
npm install @tynoc/analytics
```

## Next.js (App Router)

Add the component once, in your root layout:

```tsx
// app/layout.tsx
import { Analytics } from "@tynoc/analytics/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

Dynamic pages are grouped by route, so `/blog/a` and `/blog/b` both show up as `/blog/[slug]`.

## React

```tsx
import { Analytics } from "@tynoc/analytics/react";

export function App() {
  return (
    <>
      <Routes />
      <Analytics />
    </>
  );
}
```

To group dynamic routes yourself, pass `route` and `path`:

```tsx
<Analytics route="/products/[id]" path={location.pathname} />
```

## Any other site

```ts
import { inject } from "@tynoc/analytics";

inject();
```

Or without a package, add this tag to your HTML:

```html
<script defer src="/_tynoc/insights/script.js"></script>
```

## Custom events

Custom events are available on the Pro and Business plans.

```ts
import { track } from "@tynoc/analytics";

track("Signup", { plan: "pro", seats: 3 });
```

From server code (route handlers, server actions):

```ts
import { track } from "@tynoc/analytics/server";

export async function POST(request: Request) {
  await track("Order", { total: 499 }, { headers: request.headers });
  return Response.json({ ok: true });
}
```

The server helper sends to `TYNOC_URL` (your deployment domain, for example `my-app.deploy.tynoc.com`) or, if that is not set, to the request host. It never throws and gives up after 3 seconds.

Property rules:

- Values can be `string`, `number`, `boolean` or `null`. Nested objects are rejected.
- Event names, keys and string values are cut to 255 characters.
- Up to 32 properties per event.

## Options

| Option        | Type                                      | Default            | Description                                         |
| ------------- | ----------------------------------------- | ------------------ | --------------------------------------------------- |
| `mode`        | `"auto" \| "development" \| "production"` | `"auto"`           | In development, events are logged and not sent.     |
| `debug`       | `boolean`                                 | `true` in dev      | Log every event to the browser console.             |
| `beforeSend`  | `(event) => event \| null`                | none               | Change the URL or return `null` to drop the event.  |
| `endpoint`    | `string`                                  | `/_tynoc/insights` | Base path for the script and the ingest requests.   |
| `scriptSrc`   | `string`                                  | `<endpoint>/script.js` | Full URL of the script.                         |

### Ignore pages with `beforeSend`

```tsx
<Analytics
  beforeSend={(event) => {
    if (event.url.includes("/admin")) return null;
    return event;
  }}
/>
```

## What is collected

Each pageview sends the page URL, the route pattern, the external referrer (first page of a visit only) and the SDK name and version. Query parameters are removed except `utm_*`, `ref`, `source` and `via`. URL hashes are removed. Country, device, browser and OS are worked out on the server from request headers, and the raw headers are not stored.

## License

MIT
