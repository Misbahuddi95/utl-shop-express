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

- Company products reference vendor registrations; database policies restrict writes to the registration owner after fee verification, keeping public products directly visible.
- Root session context owns auth-change subscriptions so company and admin screens share one session and cache lifecycle.
- Admin Orders uses a shared orders view for the tab and dedicated child page; payment state is separate from fulfillment state.
