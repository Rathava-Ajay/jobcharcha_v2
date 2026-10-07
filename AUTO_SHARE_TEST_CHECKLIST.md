# Auto-share manual test checklist

Run this on a server (or tunnel) that has a **public `https://` `PublicBaseUrl`**, otherwise Instagram cannot fetch the image.
Use a test Telegram channel, test Facebook Page and test Instagram Business account if you can.

## 0. Setup

- [ ] `AddSocialShare` migration applied.
- [ ] Env vars set: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `OPENAI_API_KEY`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `INSTAGRAM_ACCOUNT_ID` (optionally `META_APP_ID`, `META_APP_SECRET`).
- [ ] API restarted. The log has no "Social share pass failed" errors.
- [ ] *Admin → Auto-share*: all four chips (Telegram, Facebook, Instagram, OpenAI) are green, and there is no amber warning.
- [ ] **Telegram test** sends a message to the channel.
- [ ] *Settings → Jobs → Preview with these colours* shows a branded sample image.
- [ ] Every category's **Ask me to approve first** is ON (the default) for the first pass.

## 1. One post per category (approval mode)

For each row: publish a real-looking test post from the **web admin** form, with *Skip social posting* **unticked**.
Within about 15 seconds three cards should appear under *Activity log → Needs approval* (Telegram, Facebook, Instagram), each with an image and a caption.

| Category | Publish from | Card shows right title/details? | Approve → Telegram | Approve → Facebook | Approve → Instagram |
| --- | --- | --- | --- | --- | --- |
| Job | Jobs tab form | [ ] | [ ] | [ ] | [ ] |
| Result | Results tab form | [ ] | [ ] | [ ] | [ ] |
| Admit Card | Admit cards tab form | [ ] | [ ] | [ ] | [ ] |
| Scheme | Schemes tab form | [ ] | [ ] | [ ] | [ ] |
| News | News tab form | [ ] | [ ] | [ ] | [ ] |

After approving, check for each channel:

- [ ] Status becomes **Posted** and an external id (message id / post id / media id) is shown.
- [ ] **Telegram:** photo with caption, bold title, details, and a button that opens the post URL. Special characters such as `& < >` in the title show correctly.
- [ ] **Facebook:** photo post on the Page with the caption and the link.
- [ ] **Instagram:** photo post with caption, at most 30 hashtags, and under 2,200 characters.
- [ ] The image text is spelled exactly as the post title (Gujarati titles render with correct joined letters).
- [ ] Clicking the post link opens the right page on the site.

## 2. Other publish paths (same flow must trigger)

- [ ] **AI Magic:** approve one News draft. Shares appear. Repeat with *Skip social posting* ticked, and confirm nothing is queued.
- [ ] **AI Magic bulk approve:** approve 2 drafts with *Skip social posting* ticked in the confirmation. Nothing is queued.
- [ ] **Job AI (mobile, phone-width browser):** post a Job through `/admin/mobile-post`. Shares appear.
- [ ] **Job AI Result / Admit Card pages:** post one of each. Shares appear.
- [ ] **Scraper queue:** *Review & Post* a draft. Shares appear.
- [ ] On the phone-width layout, the Activity Log card, the image preview, the caption editor and the buttons all fit the screen with no sideways scrolling, and buttons are easy to tap.

## 3. Rules that must hold

- [ ] **No auto re-send:** edit an already-shared post, then untick and re-tick *Active*. No new shares appear.
- [ ] **Skip:** publish with *Skip social posting* ticked. The Activity Log has no entry for it.
- [ ] **Share again:** on a posted share click **Share again**. Three new shares appear (labelled "repost #1") and post once approved. Clicking it twice quickly does not create duplicates.
- [ ] **Reject:** reject a card. It becomes *Skipped* and nothing is posted.
- [ ] **Edit caption:** edit the caption text before approving. The edited text is what gets posted.
- [ ] **New image:** click **New image** on a pending card. A fresh image replaces the old one.

## 4. Automatic mode

- [ ] Settings → News → turn **Ask me to approve first** OFF and save. Publish a News item: shares go straight to *Queued* → *Posted* with no approval.
- [ ] Turn off **Instagram** for News and publish again. Only Telegram and Facebook shares are created.
- [ ] Turn approval back ON for the categories you want reviewed.

## 5. Reliability

- [ ] **Retry / failure:** set a wrong `TELEGRAM_CHANNEL_ID`, restart, and publish. The Telegram card shows *Failed* with the error ("chat not found"), while Facebook and Instagram still post. Fix the id, restart, click **Retry**. It posts.
- [ ] **Backoff:** break connectivity (for example a bad Meta token) and watch a share go Queued → "next attempt" times roughly 1, 2, 4 minutes apart, then *Failed* after the last attempt.
- [ ] **Restart safety:** queue an approved share and restart the API before it posts. It still posts after the restart.
- [ ] **Image fallback:** temporarily blank `OPENAI_API_KEY` and publish. Shares still get a branded gradient image and post.
- [ ] **Daily cap:** set `SocialShare__DailyImageCap=1`, publish two posts. The second uses the gradient template, and the status banner shows the cap warning.
- [ ] **Unconfigured channel:** remove `INSTAGRAM_ACCOUNT_ID` and publish. The Instagram card shows *Skipped* with "isn't configured". Telegram and Facebook are unaffected.

## 6. Token warning

- [ ] With `META_APP_ID` and `META_APP_SECRET` set, the banner shows the days left on the token.
- [ ] Put in an invalid `META_PAGE_ACCESS_TOKEN`. After **Re-check token**, an amber "token was rejected" warning appears.

## 7. Security

- [ ] The browser's network tab and page source contain none of the six secrets.
- [ ] API and server logs do not contain the bot token or Meta/OpenAI tokens (including after the failures above).
- [ ] A non-admin account gets 401/403 from `/api/admin/social/*`.
