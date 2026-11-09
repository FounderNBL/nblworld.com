## CURRENT FOUNDER DECISION — November 9, 2026

**Pulse and Messenger stay on `newbeansland.org`; NBL World displays discovery links only.** The Founder approved two separate, professional world cards on the `.org` homepage—`/pulse/` for NBL Pulse and `/messenger/` for NBL Messenger. Each product has its own private source repo (`FounderNBL/Pulse` and `FounderNBL/NBL-Messenger`), but their member-facing website routes remain under the existing primary Clerk domain.

NBL World remains the **shop/discovery storefront** and may feature two product entrance cards linking directly to `https://newbeansland.org/pulse/` and `https://newbeansland.org/messenger/`, without adding another Clerk domain, separate login, hosted social feed, private conversations, call screen, Stripe checkout, or provider integrations on `.com`.

Website source split and `.org` world cards are prepared in [website draft PR #545](https://github.com/FounderNBL/FounderNBL.github.io/pull/545), not live until separately authorized and verified. Do not describe a link card as deploying the destination. No University, Beans, Android or payment routing changes authorized by this handoff.

---

## CURRENT FOUNDER DECISION — October 14, 2026

**NBL World (`nblworld.com`) is the commercial-facing shop/discovery brand.** The Founder approved moving Clerk-authenticated Beans, human-to-human NBL Messenger, University/Grey, academic records, usage/credits and NBL-owned Stripe checkouts permanently to **`newbeansland.org`**, the existing primary Clerk domain. `accounts.newbeansland.org` hosts secure authentication; no Clerk satellite plan is needed. This supersedes all October 8 statements below assigning interactive member features to `.com`. Keep the NBL World official artwork and independent Shopify/books shop links. Former member URLs here redirect to their `.org` counterparts. Existing University, Chat, Study Lab and Founder Voice source/test history is preserved for rollback, but the active UI and academic security tests now belong in website PR #407. No checkout, EAS release, Supabase deployment or merge is authorized by this draft. Do not reintroduce Clerk sessions or customer payment UI on `.com`.

---

# NBL World — live customer experience

**Founder ownership decision (2026-10-08).** This README overrides older descriptions that call NBL World only a University front door. The actual customer-facing **Beans, human NBL Messenger, and NBL University experience belongs here**.

- **Beans:** customer interacts with the AI at `nblworld.com`, not as a separately maintained interactive product inside `newbeansland.org`.
- **NBL Messenger:** people message people: community/DMs/Study Hall. **Beans** is the AI assistant. The old “NBL Chat” name is retired for public use.
- **NBL University:** Professor Grey/Virgo, student classes, course progress, coursework and academic records, with protected server-side gates.
- **Accounts/plans/usage:** any signed-in customer work, wallet/credits, plans, checkout and support surfaces belong in the NBL World experience, only when the secure backend and payment flow actually support them.
- **Shared secure backend:** protected runtime functions, student data, answer keys, provider keys and LOCKE entitlements stay on the server (Supabase / protected authorized source); they must NEVER be pushed as static public site content.
- **Public visitor site:** `newbeansland.org` is for look/touch/read/explore. It links people here to do member tasks.
- **Development decisions:** Desk (`FounderNBL/nbl-desk`) writes and checks the paper handoff before changes to this repo.
- **Protected NBL IP:** Playground is private NBL canon/master materials, not an API secret vault.

**Current-state caveat:** This is the newly confirmed ownership and desired customer route, **not evidence that Beans chat, new prices/usage, or every University transaction is already live here**. Preserve existing pages and branch work; reconcile safely in a separate future build cycle. No E2E work in this paper cycle. Founder’s Office, game and video are out of scope.

Paper contract: `FounderNBL/nbl-desk/NBL_FOUNDER_REPO_ROUTING_PAPER_PLAN_2026-10-08.md`.
