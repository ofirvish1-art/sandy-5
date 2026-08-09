# מרקטפלייס קבלני עפר — MVP

אתר Web/PWA בעברית (RTL) למרקטפלייס קבלני עפר: פרסום היצע/ביקוש לחול, חמרה ומצע, התאמות אוטומטיות, תכנון קדימה, מפה, והתראות וואטסאפ כשמישהו מתעניין בפרסום.

**סטאק:** Next.js (App Router) + Tailwind CSS + Supabase (DB + Storage + Edge Functions) + Vercel לפריסה.

---

## שלב 0 — הרצה מקומית

```bash
npm install
cp .env.local.example .env.local   # תמלא בשלב 1 למטה
npm run dev
```
האתר יעלה על http://localhost:3000 — אבל לא יעבוד באמת עד שתחבר Supabase (שלב 1).

---

## שלב 1 — יצירת פרויקט Supabase

1. כנס ל-https://supabase.com ← Sign up / התחבר.
2. **New project** → תן שם (למשל `earthworks-marketplace`) → תבחר סיסמת DB (שמור אותה) → אזור קרוב (Frankfurt/eu-central-1 טוב לישראל) → **Create**.
3. בתפריט השמאלי: **Project Settings → API**. תעתיק משם שני ערכים:
   - **Project URL**
   - **anon public key**
4. פתח את הקובץ `.env.local` בפרויקט והדבק:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. הרץ מחדש `npm run dev`.

---

## שלב 2 — יצירת הטבלאות (Database)

1. ב-Supabase: **SQL Editor → New query**.
2. פתח את הקובץ `supabase/schema.sql` מהפרויקט, העתק את **כל** התוכן, הדבק ב-SQL Editor, ולחץ **Run**.
3. זה יוצר: `users`, `listings`, `matches`, `interest_events`, מדיניות אבטחה (RLS), ו-bucket אחסון לתמונות בשם `listing-images`.
4. וודא ב-**Table Editor** שרואים את 4 הטבלאות.

בשלב הזה האתר כבר עובד באמת: הרשמה, פרסום היצע/ביקוש, התאמות, תכנון קדימה, מפה — הכל נשמר ב-Supabase.

---

## שלב 3 — בדיקה

1. גלוש ל-`/register`, תירשם עם שם וטלפון.
2. גלוש ל-`/supply`, תפרסם היצע לדוגמה, ולחץ "השתמש במיקום שלי" כדי שהוא יופיע גם במפה.
3. גלוש ל-`/demand`, תפרסם ביקוש דומה (אותו סוג חומר, מיקום קרוב).
4. גלוש ל-`/matches` — אמור להופיע כרטיס התאמה.
5. גלוש ל-`/map` — שתי הנקודות אמורות להופיע.
6. גלוש ל-`/admin` — אמור להראות את המספרים המעודכנים.

---

## שלב 4 — התראות וואטסאפ כשמישהו מתעניין

ככה זה עובד: כל לחיצה על "התקשר" או "וואטסאפ" בכרטיס פרסום נשמרת בטבלת `interest_events`. **Database Webhook** ב-Supabase מזהה INSERT חדש ומפעיל **Edge Function** (`notify-on-interest`) ששולחת הודעת וואטסאפ לבעל הפרסום דרך Twilio.

### 4.1 יצירת חשבון Twilio (לשליחת וואטסאפ)

1. כנס ל-https://www.twilio.com/try-twilio ותירשם (יש טריאל חינמי).
2. בדשבורד תמצא **Account SID** ו-**Auth Token** — תשמור אותם.
3. כדי לשלוח וואטסאפ בלי אישור עסקי מלא ב-Meta, השתמש ב-**Twilio WhatsApp Sandbox**:
   - בתפריט: **Messaging → Try it out → Send a WhatsApp message**.
   - תקבל מספר sandbox (למשל `+14155238886`) והוראה לשלוח קוד הצטרפות מהוואטסאפ שלך אליו (כדי "להצטרף" לסאנדבוקס).
   - **חשוב:** בסאנדבוקס, רק מספרים שהצטרפו יכולים לקבל הודעות. זה מספיק לפיילוט עם קבוצת קבלנים מצומצמת. לפני שיווק רחב יותר תצטרך WhatsApp Business API מאושר (Twilio יכול לעזור גם בזה, זה תהליך אימות נפרד).

### 4.2 התקנת Supabase CLI ופריסת ה-Edge Function

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # הרף מופיע ב-URL של הפרויקט
```

הגדר את הסודות (secrets) שה-Function צריכה:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx
supabase secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

פרוס את הפונקציה:

```bash
supabase functions deploy notify-on-interest
```

### 4.3 חיבור ה-Webhook

1. ב-Supabase Dashboard: **Database → Webhooks → Create a new hook**.
2. **Name:** `notify-on-interest`
3. **Table:** `interest_events`
4. **Events:** ✅ Insert בלבד
5. **Type:** Supabase Edge Function
6. **Edge Function:** `notify-on-interest`
7. שמור.

מעכשיו: כל לחיצה על וואטסאפ/התקשר בכרטיס פרסום → נשמר `interest_event` → ה-webhook קורא ל-function → בעל הפרסום מקבל הודעת וואטסאפ.

> **חלופה פשוטה יותר לניסוי ראשון בלי Twilio:** אפשר לדלג על שלב 4 כרגע ולחבר את זה מאוחר יותר — האתר עובד לגמרי גם בלעדיו, רק בלי ההתראה האוטומטית. שקול גם [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) כחלופה ל-Twilio אם תרצה לדלג על "אמצעי שלישי" ולהתחבר ישירות ל-Meta.

---

## שלב 5 — פריסה ל-Vercel

1. העלה את הפרויקט ל-GitHub (repo חדש, `git init && git add . && git commit -m "init" && git push`).
2. כנס ל-https://vercel.com ← **Add New Project** ← תבחר את ה-repo.
3. ב-**Environment Variables** תוסיף:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (אותם ערכים מ-`.env.local`)
4. **Deploy**. תוך דקה תקבל קישור ציבורי (`https://your-app.vercel.app`) שאפשר לשלוח לקבלנים.
5. (רשות) חבר דומיין משלך ב-**Project Settings → Domains**.

---

## מבנה הפרויקט

```
app/
  page.js            עמוד הבית / דשבורד
  register/          הרשמה
  supply/            "יש לי לתת"
  demand/            "אני צריך"
  matches/           התאמות
  timeline/           תכנון קדימה
  map/                מפה (Leaflet + OpenStreetMap, בלי מפתח API)
  admin/              Admin Dashboard
  profile/            פרופיל אישי
components/           רכיבי UI משותפים
lib/                  Supabase client, session, נוסחת התאמות, פורמטים
supabase/
  schema.sql           הסכימה המלאה — טבלאות + RLS + storage bucket
  functions/notify-on-interest/   ה-Edge Function ששולחת וואטסאפ
```

---

## שים לב — פשרות מכוונות ב-MVP הזה

- **אין התחברות אמיתית (Auth).** משתמש מזוהה לפי טלפון שנשמר ב-localStorage, בדיוק כמו שהאפיון ביקש ("בלי מערכת הרשאות מורכבת"). זה אומר שמדיניות ה-RLS פתוחה יחסית (כל אחד עם ה-anon key יכול לקרוא/לכתוב). מתאים לפיילוט סגור עם קבוצת קבלנים מוכרת. **לפני שיווק רחב** — להחליף ל-Supabase Auth עם אימות SMS (יש להם את זה מובנה), ואז להדק את ה-RLS לפי `auth.uid()`.
- **המפה היא Leaflet + OpenStreetMap** (חינמי, בלי מפתח API) ולא Google Maps — כדי לא לדרוש חיוב כרטיס אשראי כבר בשלב הפיילוט. אם תרצה Google Maps בהמשך, זה שינוי מוכל לרכיב אחד (`app/map/MapClient.js`).
- **וואטסאפ עובד דרך Twilio Sandbox** בהתחלה (חינמי אבל מוגבל למספרים שהצטרפו ידנית). למעבר לכלל הציבור צריך WhatsApp Business API מאושר.
- **התאמות מחושבות בצד לקוח** (`lib/matching.js`) לפי הכללים שבאפיון (מרחק, זמן, כמות). לעומס גדול יותר בעתיד, אפשר להעביר את זה לפונקציית DB/Edge Function שרצה כשנוצר פרסום חדש.
