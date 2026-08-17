# Turning on WhatsApp notifications

Everything up to the final hop already works. When someone taps "אני מעוניין",
calls, or opens WhatsApp on a listing:

1. a row goes into `interest_events`
2. the `interest_events_notify` trigger fires
3. both parties get an in-app notification, and the listing owner sees a live
   toast if they have the site open
4. a row goes into `notification_attempts` recording what we tried to send

Step 5 — actually delivering to WhatsApp — is off until you complete the setup
below. Until then every attempt is honestly recorded as
`skipped: no delivery provider configured yet`, and `interest_events.notified`
stays `false`.

---

## Before you start: the template rule

WhatsApp does **not** let you send free-form text to someone who has not
messaged you in the previous 24 hours. "Somebody is interested in your listing"
is exactly that kind of unsolicited, business-initiated message, so it must go
out as a **pre-approved template**.

Register a template with two body variables, something like:

```
שלום {{1}}, מישהו התעניין במודעה שלך בסנדיט: {{2}}.
```

`{{1}}` is the owner's name, `{{2}}` is the material and quantity. That order is
what `templateVariables()` in `app/api/notify/route.ts` produces.

Two things to watch:

- **Category matters.** Utility is much cheaper than marketing, and Meta has
  been tightening what qualifies. Confirm the category when you submit.
- **The sending number must not already be on the regular WhatsApp app.**
  You need a dedicated line.

You already have the opt-in Meta requires: sign-up records
`users.consent_whatsapp_operational`.

---

## 1. Get a provider

| Option | Trade-off |
| --- | --- |
| **Meta WhatsApp Cloud API** (direct) | Free API access, pay Meta per message. Needs a Meta Business account and business verification. Cheapest, slowest to set up. |
| **A BSP** — 360dialog, Gupshup, Infobip, Bird | They handle verification and onboarding, and add a markup. Days faster. |

Whatever you pick, you need a **send endpoint URL** and an **API token**.

## 2. Set the environment variables in Vercel

Vercel → your project → Settings → Environment Variables. Add to **Production**
(and Preview, if you want to test there):

| Variable | Value |
| --- | --- |
| `NOTIFY_SHARED_SECRET` | any long random string you invent — see step 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |
| `WHATSAPP_API_URL` | your provider's send endpoint |
| `WHATSAPP_API_TOKEN` | your provider's bearer token |
| `WHATSAPP_TEMPLATE_NAME` | the approved template's name |
| `WHATSAPP_PROVIDER` | a label, e.g. `meta` — recorded on each attempt |
| `WHATSAPP_FROM` | only if your provider requires a sender id |
| `WHATSAPP_TEMPLATE_LANG` | only if your template isn't `he` |

⚠️ **`SUPABASE_SERVICE_ROLE_KEY` bypasses all row-level security.** It is used
server-side only, in the API route, and must never get a `NEXT_PUBLIC_` prefix —
that would ship it to every browser.

Leave `WHATSAPP_TEMPLATE_NAME` unset only while testing against your own number:
the route then sends plain text, which works inside the 24-hour window.

## 3. Point the database at the route

In Supabase → SQL Editor, using the same secret you set above:

```sql
insert into public.app_config (key, value) values
  ('notify_function_url', 'https://YOUR-DOMAIN.vercel.app/api/notify')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.app_config (key, value) values
  ('notify_service_key', 'THE-SAME-STRING-AS-NOTIFY_SHARED_SECRET')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

`app_config` has RLS on with no policies, so the browser can never read these.
The route rejects any request whose bearer token doesn't match.

## 4. Test

Tap "אני מעוניין" on a listing you don't own, then:

```sql
select source_channel, status, provider, error, created_at
from public.notification_attempts
order by created_at desc
limit 5;
```

- `sent` — it worked, and `interest_events.notified` is now `true`
- `failed` — the `error` column holds the provider's exact response
- `skipped` — configuration is still incomplete; the reason is in `error`

---

## If your provider's request format differs

`buildBody()` in `app/api/notify/route.ts` is the only function to change. It is
shaped for Meta's Cloud API, which most providers mirror. Nothing else in the
pipeline knows or cares which provider you use.
