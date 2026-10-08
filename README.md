# NBL World — live customer experience

**Founder ownership decision (2026-10-08).** This README overrides older descriptions that call NBL World only a University front door. The actual customer-facing **Beans, human NBL Chat, and NBL University experience belongs here**.

- **Beans:** customer interacts with the AI at `nblworld.com`, not as a separately maintained interactive product inside `newbeansland.org`.
- **NBL Chat:** people message people: community/DMs/Study Hall. It is not another name for Beans AI.
- **NBL University:** Professor Grey/Virgo, student classes, course progress, coursework and academic records, with protected server-side gates.
- **Accounts/plans/usage:** any signed-in customer work, wallet/credits, plans, checkout and support surfaces belong in the NBL World experience, only when the secure backend and payment flow actually support them.
- **Shared secure backend:** protected runtime functions, student data, answer keys, provider keys and LOCKE entitlements stay on the server (Supabase / protected authorized source); they must NEVER be pushed as static public site content.
- **Public visitor site:** `newbeansland.org` is for look/touch/read/explore. It links people here to do member tasks.
- **Development decisions:** Desk (`FounderNBL/nbl-desk`) writes and checks the paper handoff before changes to this repo.
- **Protected NBL IP:** Playground is private NBL canon/master materials, not an API secret vault.

**Current-state caveat:** This is the newly confirmed ownership and desired customer route, **not evidence that Beans chat, new prices/usage, or every University transaction is already live here**. Preserve existing pages and branch work; reconcile safely in a separate future build cycle. No E2E work in this paper cycle. Founder’s Office, game and video are out of scope.

Paper contract: `FounderNBL/nbl-desk/NBL_FOUNDER_REPO_ROUTING_PAPER_PLAN_2026-10-08.md`.
