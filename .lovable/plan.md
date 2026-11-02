# Product pages for search

- Add `/product/$id` with server-loaded product details, category, availability, the existing cart action, and image zoom.
- Link homepage product images and names to those pages; keep the separate Add button and storefront appearance unchanged.
- Reuse the existing cart drawer and checkout on product pages, without changing their behavior.
- Add product-specific titles, descriptions, canonical URLs, social tags, and Product structured data using the published UTL URL. Missing products show a simple not-found message.
- Replace the static sitemap with `/sitemap.xml`, listing the homepage and all public products. Preserve the existing robots.txt sitemap line.
- Verify server HTML, missing products, sitemap pagination/error handling, image links, cart quantities, and checkout on desktop and mobile.

## Technical details

- Product loader primes TanStack Query through a public server function using a session-free publishable client and existing access rules.
- Sitemap uses the same public access, stable ID ordering, and full pagination; failed queries never return partial successful XML. Omit lastmod because no authoritative content-change timestamp is available.
- Use a focused custom sitemap handler to keep admin and portal files untouched, rather than installing route-wide sitemap decisions.
- Relative product image URLs are resolved against the published site for structured data/social tags; absent or embedded data images do not become invalid social URLs.
- No admin, portal, security-rule, price, or payment changes.