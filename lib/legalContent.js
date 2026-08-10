// Single source of truth for legal/about copy — used by both the
// registration modal (item 9) and the Profile "About" page (item 15).
//
// NOTE: this is still placeholder text. The upgrade prompt referenced
// "the provided legal text" but no actual legal copy was included in
// either prompt so far — replace these three strings with the real,
// lawyer-approved text before taking the site live to the public.

export const LEGAL_CONTENT = {
  about: {
    title: "אודות חולית",
    body: `[placeholder — טרם התקבל נוסח רשמי]

חולית היא פלטפורמת תיווך דיגיטלית המחברת בין קבלני עפר, ספקים ורוכשים של עודפי חול, חמרה, מצע וחומרי מילוי אחרים — לפי מיקום, כמות וזמן. המטרה: לחסוך את החיפוש הידני בקבוצות וואטסאפ ולתת לכל הצדדים דרך מהירה ואמינה למצוא התאמה.`,
  },
  terms: {
    title: "תנאי שימוש",
    body: `[placeholder — יש להחליף בנוסח המשפטי הרשמי לפני פרסום לציבור]

שימוש באפליקציית חולית כפוף לתנאים אלה. המשתמש מתחייב למסור פרטים נכונים ועדכניים, ולהשתמש בשירות למטרות חוקיות בלבד הקשורות לפרסום ואיתור חומרי עפר ומילוי.`,
  },
  privacy: {
    title: "מדיניות פרטיות",
    body: `[placeholder — יש להחליף בנוסח המשפטי הרשמי לפני פרסום לציבור]

חולית אוספת שם, טלפון, מייל ומיקום לצורך תפעול השירות. פרטי הקשר והמיקום שמפרסם משתמש עשויים להיות מוצגים למשתמשים אחרים לצורך יצירת קשר בנוגע למודעה. ניתן לבקש עיון או מחיקה של הנתונים בפנייה לבעלי האתר.`,
  },
  disclaimer: `חולית משמשת כפלטפורמת תיווך בלבד בין קבלנים. חולית אינה צד לעסקה, אינה אחראית לאיכות החומר, למשקל, לתנאי ההובלה או לכל מחלוקת בין הצדדים. יש לוודא עצמאית את כל פרטי העסקה מול הצד השני לפני ביצועה. [נוסח זה הוא placeholder — יש להחליפו בנוסח משפטי מלא ומאושר.]`,
};
