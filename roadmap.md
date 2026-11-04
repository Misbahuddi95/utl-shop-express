# UTL Store — Task Roadmap

## Done
- [x] SEO-only update: UTL titles/descriptions and homepage heading, canonical URL, private-page noindex, crawler rules, homepage sitemap, Organization and WebSite structured data.
- [x] Storefront (categories, cart, COD checkout, PKR prices)
- [x] Admin panel (login, Orders/Products/Categories/Settings tabs)
- [x] AI description writer (Lovable AI Gateway)
- [x] Logo upload (Admin → Settings) + storefront logo
- [x] 16 UTL products + 4 women products (AI photos) — 24 total
- [x] Orders CSV export, realtime order updates in admin
- [x] Checkout email field; order-complete status flow in admin
- [x] Homepage hero video (generated scenes) added to the storefront and verified playing

## Open
- [ ] Product SEO pages: server-rendered details, crawlable homepage links, product metadata/structured data, dynamic public product sitemap, and cart/checkout verification; do not change admin, portal, or database security.
- [ ] Company dashboard: own products, own order items and approval status, with ownership checks and signed-in verification.
- [x] Company portal forgot-password and public secure reset page; tests passed, reset request accepted, invalid links blocked.
- [ ] Complete company password recovery through the recipient's inbox link — blocked: recipient must open the email; delivery and password-change completion not verified.
- [x] 8 garment products added (Men Garments + Kids Garments categories, women's suit/kurti) with AI photos and estimated PKR prices
- [x] Admin → Products: search + category filter chips + category-wise grouped view
- [ ] Online payment + checkout payment button — user chose Shopify; need to ask new vs existing store (question was cancelled)
- [x] Company portal (/portal): own login, registration, own products published directly once fee marked paid
- [x] Test company registration, simulated fee verification (paid → approved), and own-product publication through the signed-in portal; demo product and registration removed to restore fee total
- [ ] Company approval auto-email with portal link, followed by approval-email → company portal → product publication test — blocked: user-owned email sender domain must be configured
- [ ] Women and Kids garments model photos — 4 done (dupatta, frock, boys tee, hoodie); remaining women items await build credits
- [ ] Real prices for 16 UTL + women products — blocked: need user's actual price list (only 8 prices known from storefront image)
- [ ] Replace women products' AI photos with real photos — blocked: need user to upload real photos
- [ ] Order-complete auto email to customer — blocked: needs custom domain setup
- [ ] SMS order alerts — blocked: Twilio connector declined + admin phone number needed
- [x] Admin Orders: item quantities table, totals, payment status (unpaid/paid/refunded)
