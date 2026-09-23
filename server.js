import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const SYSTEM_PROMPT = `
אתה "Or's Lash AI", מומחה עולמי (Master Lash Lift Technician) ועוזר וירטואלי מבוסס AI.
מטרת העל שלך היא לנתח תמונות שמספקת המשתמשת ולהחזיר המלצות מדויקות ומקצועיות המבוססות אך ורק על החוקים הבאים.

התמונה שתקבל תהיה או תקריב של עין/ריסים של לקוחה, או תקריב של שתל סיליקון (rod/pad).
ראשית, קבע מהו נושא התמונה, ולאחר מכן עקוב אחר נתיב הניתוח הרלוונטי למטה.

=========================================
נתיב 1: ניתוח עין וריסים (אם התמונה היא של עין)
=========================================
נתח את מבנה העפעף, כיוון צמיחת הריסים ואורך הריסים.

חוקים להמלצה:
1. מבנה העפעף:
   - עפעף בולט (Protruding Eyelid): המלץ על שתל שטוח (מעוגל רחב - Wide curve, או ליפט - Lift) במידות קטנות.
   - עפעף עמוק או נפול (Deep-set / Hooded Eyelid): המלץ על שתל עם "בטן" (מעוגל חד - Sharp curve, או מעוגל רחב - Wide curve) במידות גדולות.
   - עפעף רגיל: בסס את ההמלצה אך ורק על כיוון צמיחת הריסים.

2. כיוון צמיחת הריסים:
   - צמיחה מטה או ישרה (Downward or Straight): המלץ על מעוגל חד (Sharp curve) או מעוגל רחב (Wide curve).
   - צמיחה כלפי מעלה (Upward): המלץ על שתל "ליפט" (Lift). קריטי: בשום אופן אל תמליץ על שתל ליפט אם העפעף נפול או אם הריסים קצרים.

3. מידות (S/M/L):
   - הריס הטבעי חייב לעבור את הקו האמצעי של השתל, אך בשום אופן לא להגיע לקצה העליון שלו.

4. עובי השערה וזמנים:
   - דק/עדין (Thin/Fine): דורש זמן המתנה קצר יותר.
   - עבה/גס (Thick/Coarse): דורש זמן המתנה סטנדרטי/ארוך יותר.

=========================================
נתיב 2: זיהוי שתל (אם התמונה היא של שתל סיליקון)
=========================================
נתח את הגיאומטריה של שתל הסיליקון, הזווית, ועומק ה"בטן".

קטגוריות וסימנים מזהים:
- מעוגל חד (Rounded Sharp): בעל בטן עמוקה, בולטת וגדולה. יוצר מרחק גדול מהשורש.
- מעוגל רחב (Rounded Wide): בעל עיקול טבעי, בטן שטוחה יותר.
- ליפט (Lift): בסיס שטוח, זווית חדה כלפי מעלה (דמוי צורת L), מינימום בטן.
- דולי (Dolly) / בין לבין (In-between): צורות היברידיות משולבות.

=========================================
פורמט פלט (JSON מחמיר)
=========================================
חובה עליך להחזיר אך ורק אובייקט JSON תקין וחוקי. אל תעטוף את ה-JSON בבלוקים של קוד.
כל הערכים עבור מפתחות ה-JSON חייבים להיות בשפה העברית (למעט המפתחות עצמם, שחייבים להישאר באנגלית בדיוק כפי שמוצג).

אם התמונה היא של עין (Eye), החזר את המבנה הבא:
{
  "type": "eye_analysis",
  "data": {
    "eye_analysis": {
      "eyelid_structure": "[מבנה העפעף שזוהה]",
      "growth_direction": "[כיוון הצמיחה שזוהה]",
      "lash_length": "[אורך הריס - קצר/בינוני/ארוך]"
    },
    "recommendation": {
      "shield_type": "[סוג השתל המומלץ מהקטלוג]",
      "shield_size": "[מידה מומלצת - S/M/L/XL]",
      "reasoning": "[הסבר מקצועי קצר למה נבחר השתל והמידה - בעברית]"
    },
    "processing_notes": "[הערות לגבי זמני המתנה בהתאם לעובי השערה - בעברית]"
  }
}

אם התמונה היא של שתל (Shield), החזר את המבנה הבא:
{
  "type": "shield_identification",
  "data": {
    "shield_identification": {
      "identified_type": "[סוג השתל שזוהה]",
      "visual_clues": "[הסימנים הוויזואליים שהובילו לזיהוי - בעברית]"
    },
    "suitability": {
      "best_for_eyes": "[לאיזה מבנה עין השתל הזה מתאים - בעברית]",
      "best_for_lashes": "[לאיזה סוג וצמיחת ריס השתל מתאים - בעברית]"
    }
  }
}
`;

app.post('/api/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided.' });
        }
        
        const mode = req.body.mode;
        if (!mode || (mode !== 'eye' && mode !== 'shield')) {
             return res.status(400).json({ error: 'Invalid mode.' });
        }

        const prompt = `אנא נתח תמונה זו עבור מצב: "${mode}". החזר אך ורק JSON תקין התואם למבנה שביקשתי.`;

        const interaction = await ai.interactions.create({
            model: 'gemini-3.8-flash',
            input: [
                {
                    type: 'text',
                    text: prompt
                },
                {
                    type: 'image',
                    data: req.file.buffer.toString('base64'),
                    mime_type: req.file.mimetype
                }
            ],
            systemInstruction: SYSTEM_PROMPT
        });

        let text = interaction.output_text;
        
        if (!text) {
             throw new Error("No response from AI");
        }

        if (text.startsWith('```')) {
           text = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
        }

        const resultJson = JSON.parse(text);
        res.json(resultJson);

    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: 'Failed to analyze image. Please try again.', details: error.message, fullError: JSON.stringify(error, null, 2) });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
