---
name: blotato
description: Publish or schedule social media posts through Blotato (Instagram, TikTok, Facebook, X/Twitter, LinkedIn, Threads, Bluesky, Pinterest, YouTube, Slack, Discord). Use when the user wants to post, schedule, queue, check the status of, or list scheduled social posts, or look up their connected Blotato accounts. Pairs with the `content` skill, which writes the drafts.
---

# Blotato publishing

Blotato is the posting layer. Drafts come from the `content` skill (or the user);
this skill turns an **approved** draft into a Blotato post.

Helper: `.claude/skills/blotato/scripts/blotato.sh` (run with `bash`). Base URL
`https://backend.blotato.com/v2`, auth header `blotato-api-key`.

Full docs (agent-friendly markdown): https://help.blotato.com/llms.txt —
publishing contract: https://help.blotato.com/start-with-an-ai-agent/llm/publishing.md

## Auth

- If Blotato MCP tools (`blotato_*`) are available, use them instead of REST.
- Otherwise the script uses `$BLOTATO_API_KEY`, or a key saved as a network
  secret for `backend.blotato.com` (header `blotato-api-key`), which the proxy injects.
- Keys may end in `=`; that is part of the key. Never print, log, or commit a key.
- Verify first: `bash .claude/skills/blotato/scripts/blotato.sh me`. A 401 means
  no/invalid key: stop and tell the user how to provide one.

## Workflow

1. **Resolve the destination.** `blotato.sh accounts [platform]`. Match platform
   + account name to what the user asked. Several matches → ask. Never pick the
   first one by default.
   - Facebook Page / LinkedIn company Page / Slack or Discord channel →
     `blotato.sh subaccounts <accountId>`, use the chosen id as `target.pageId`
     or `target.channelId`.
   - Pinterest → `blotato.sh boards <accountId>` → `target.boardId`.
2. **Build the payload** as a JSON file in the scratchpad (not the repo), one
   file per destination. `content.platform` and `target.targetType` are the same
   value. `mediaUrls` is required (`[]` for text-only) and must be direct public
   file URLs, not web pages.
3. **Get explicit approval.** Show the user the exact text, media, account,
   and timing for every destination. A request to "draft" is not approval to post.
   Without `scheduledTime` or `useNextFreeSlot`, the post **publishes immediately**.
4. **Submit:** `blotato.sh post payload.json` → `{ "postSubmissionId": "..." }`. Save the id.
5. **Verify:** `blotato.sh wait <id>`. `published` → report `publicUrl` if
   present; `scheduled` → report the time; `failed` → read `errorMessage`, fix,
   and only then retry. **Never re-POST because polling timed out** (that
   double-posts). In multi-platform batches, track each destination separately
   and don't resend the ones that succeeded.
6. Record the result in the draft file's front matter (`status`, `postSubmissionId`, `publicUrl`).

## Payload

```json
{
  "post": {
    "accountId": "98432",
    "content": { "text": "Caption here", "mediaUrls": ["https://.../photo.jpg"], "platform": "instagram" },
    "target": { "targetType": "instagram" }
  },
  "scheduledTime": "2026-12-01T17:00:00-05:00"
}
```

Scheduling fields go at the **root, next to `post`**. Nested inside `post` they
are ignored and the post goes out immediately. Use either `scheduledTime` (ISO 8601
with offset; the business is in Charlotte, NC, so use `America/New_York` unless told otherwise)
or `"useNextFreeSlot": true`, never both.

Threads (X, Bluesky, Threads, Discord): first post in `content.text`, the rest in
`content.additionalPosts: [{ "text": "...", "mediaUrls": [] }]`.

## Required target fields by platform

| Platform | `target` fields |
|---|---|
| twitter, bluesky | none |
| threads | optional `replyControl`: `everyone` / `accounts_you_follow` / `mentioned_only` |
| linkedin | optional `pageId` (omit for personal profile). 2–10 images → document carousel |
| facebook | **`pageId`** required. Videos need `mediaType: "reel"`; `"story"` for stories. Optional `link`, `firstComment` |
| instagram | optional `mediaType` (`reel`/`story`), `altText`, `collaborators` (≤3, not on carousels), `coverImageUrl`, `shareToFeed`, `firstComment`. Stories: `content.text` must be `""` |
| tiktok | **all required:** `privacyLevel` (`PUBLIC_TO_EVERYONE`/`SELF_ONLY`/`MUTUAL_FOLLOW_FRIENDS`/`FOLLOWER_OF_CREATOR`), `disabledComments`, `disabledDuet`, `disabledStitch`, `isBrandedContent`, `isYourBrand`, `isAiGenerated` (booleans). Optional `title` (≤90, photo posts), `autoAddMusic`, `isDraft` |
| pinterest | **`boardId`** required; optional `title`, `altText`, `link` |
| youtube | **`title`, `privacyStatus`** (`public`/`unlisted`/`private`), **`shouldNotifySubscribers`** required; description = `content.text` |
| slack / discord | **`channelId`** required (Discord forum also needs `title`) |

For our own product posts on TikTok: `isYourBrand: true`, `isBrandedContent: false`,
and `isAiGenerated: true` whenever the media was AI-generated.

## Media

- Public URL already? Use it directly in `mediaUrls`.
- Local file: `POST /media/uploads` with `{"filename": "x.jpg"}` → PUT the bytes to
  `presignedUrl` with the right `Content-Type` → use `publicUrl`. The upload host
  may be blocked by this environment's network policy; if so, ask the user to allow it.
- Specs: https://help.blotato.com/rest-api-reference/publish-post/media.md

## Other operations

- `blotato.sh schedules`: upcoming scheduled posts. Edit/cancel with `PATCH`/`DELETE /schedules/:id`
  (confirm with the user before cancelling).
- Analytics: `GET /analytics`, `GET /posts/:id/analytics` (published post id, not submission id).
- Rate limits: `POST /posts` 30/min, status/list 60/min.
- TikTok solo plans: max 3 distinct TikTok accounts posted to per rolling 24h.
