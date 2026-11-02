<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Company password recovery uses a public `/reset-password` page and Cloud Auth recovery sessions, not company approval status; account recovery must remain available before and after approval.
- Serve the homepage and public product URLs from the dynamic `/sitemap.xml` handler using paginated anonymous reads; omit lastmod unless an authoritative page-specific content timestamp exists. This keeps new products discoverable without rebuilding a static file.
- Product pages load public product/category DTOs through a server function and reuse the storefront cart/checkout layout, so product SEO never needs privileged reads or divergent checkout behavior.
