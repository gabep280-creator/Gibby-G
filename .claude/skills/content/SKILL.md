---
name: content
description: Write social media content for Noah's Pork Rinds: captions, hooks, short-form video scripts, carousels, threads, and weekly content calendars, in the brand voice and sized per platform. Use when the user asks for posts, captions, content ideas, a content calendar, promo copy, or "something to post". Saves drafts to content/drafts/ and hands approved drafts to the `blotato` skill to publish or schedule.
---

# Content for Noah's Pork Rinds

## The brand

- **Product:** Pork rinds in three flavors: **Salt & Pepper** (the classic), **Spicy BBQ**,
  and **Spicy Dill Pickle** (the cult favorite).
- **Where:** Charlotte, NC. Sold in local convenience stores, gas stations, delis and
  grocers (Uptown, NoDa, South End, Plaza Midwood, Dilworth, Steele Creek…). Delivered by
  our own drivers on weekly routes.
- **Angle:** a local, hand-delivered snack brand. Crunchy, bold, high-protein and low-carb
  (keto-friendly). Only make nutrition claims the user has confirmed against the label.
- **Voice:** a friendly local who knows every store clerk by name. Short sentences,
  playful, confident, a little Southern. Food words over marketing words ("crunch", "tang",
  "smoky"). No corporate speak, no ALL-CAPS shouting, at most 1–2 emoji per post.
- **Don'ts:** never invent prices, promos, store stock, partnerships, or testimonials.
  If a post needs one of those, leave a `[TODO: …]` placeholder and ask.

If the user gives brand facts that conflict with this section, follow the user and offer to
update this file.

## Content pillars (rotate through these)

1. **Flavor spotlight:** one flavor, sensory description, a pairing or occasion.
2. **Find us:** "now at [store]" and neighborhood shout-outs. Pull real store names from the
   app (`prisma/seed.ts`, or the DB via `/api/locations`), and only name stores the user confirms carry it.
3. **On the route:** behind the scenes with the drivers and delivery days. Real, scrappy, local.
4. **Fan favorites / polls:** "Team Pickle or Team BBQ?" Use the app's rankings
   (`/api/dashboard`, `lib/grading.ts`) for real "top seller this month" facts when the data exists.
5. **Snack ideas:** keto snacks, game-day boards, pork rind "nachos", crusted chicken.

## Platform fit

| Platform | Format | Notes |
|---|---|---|
| Instagram | Reel (9:16) or carousel ≤10, caption ≤2,200 | Hook in line 1; 3–5 hashtags; local tags (#CharlotteEats #CLT #CLTfood) |
| TikTok | 15–45s vertical video script | Hook in the first 2s, on-screen text, trending-sound note |
| Facebook | Page post or Reel | Slightly longer; store address and "find us" info welcome |
| X / Threads / Bluesky | ≤280 chars (X); threads via additional posts | Punchy, one idea |
| LinkedIn | Founder/small-business story | Only if the user wants it; professional but warm |
| Pinterest | Recipe/snack-idea pins | Title + link required for good pins |

## Workflow

1. **Clarify briefly** only when you need to: platform(s), goal (awareness, store launch,
   flavor push), and timing. Otherwise default to Instagram + TikTok + Facebook.
2. **Write 2–3 options** per piece, each with a different hook. For video, give a shot list:
   `0–2s hook / 2–10s product / 10–20s payoff / CTA`, plus on-screen text and caption.
3. **Save the drafts** to `content/drafts/YYYY-MM-DD-<slug>.md` using this front matter:

   ```markdown
   ---
   status: draft            # draft | approved | scheduled | published | failed
   platforms: [instagram, tiktok]
   scheduled_for:           # ISO 8601 with offset, America/New_York
   media: []                # direct public URLs, or a description of the shot needed
   postSubmissionId:
   publicUrl:
   ---
   ## Instagram
   <caption>

   ## TikTok
   <script + caption>
   ```

4. **Calendars:** for "plan my week/month", write `content/calendar/YYYY-MM.md` as a table
   (date, platform, pillar, hook, draft link), with no more than one pillar repeated back-to-back.
5. **Hand off:** when the user approves a draft, set `status: approved` and use the
   `blotato` skill to publish or schedule it. Never publish without explicit approval of the final text, media, accounts and time.
6. **Media:** if there's no photo or video yet, describe the shot to capture (phone-friendly,
   natural light, product in a real store or hand). AI image or video generation is
   optional and needs the user's go-ahead. Flag AI media so TikTok's `isAiGenerated` is set.

## Quality bar

- First line works on its own (it's all most people see).
- One clear CTA: "Grab a bag at ___", "Which flavor wins?", "Tag your snack buddy".
- Read it aloud. If it sounds like an ad agency wrote it, rewrite it.
- Check character limits for each platform before handing off.
