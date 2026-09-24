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
אתה מומחה להרמת ריסים (Lash Lift Master). תפקידך לנתח במדויק תמונות של עיניים או שתלי סיליקון (Shields/Rods) ולספק המלצות מקצועיות חדות, עקביות וחד-משמעיות.

חוקי הברזל לבחירת שתל (חובה לפעול לפיהם תמיד, ללא חריגות):

1. ניתוח מבנה עין:
   - עפעף נפול (Hooded) או עיניים שקועות (Deep-set): חובה להמליץ תמיד על שתל עגול (Rounded / Dolly) או Hybrid (בעל בטן רחבה). אסור להמליץ על שתל שטוח (Flat/Lift) כיוון שהריס יפגע בעפעף הנופל.
   - עפעף בולט (Protruding): חובה להמליץ על שתל שטוח (Flat / Lift) או Hybrid. אסור להמליץ על שתל עגול כדי למנוע סלסול יתר לאחור.
   - עפעף רגיל/שקדי: מתאים לרוב סוגי השתלים, יש לבסס את ההחלטה על כיוון הצמיחה.

2. כיוון צמיחת הריסים:
   - צמיחה כלפי מטה (Downward): דורש שבירת זווית חזקה, מומלץ שתל עגול (בטן תספק מנוף חזק) או Hybrid.
   - צמיחה ישרה (Straight): מומלץ Hybrid או Lift להרמה דרמטית, או עגול למראה טבעי.
   - צמיחה כלפי מעלה (Upward): הריס כבר מורם. מומלץ שתל Hybrid או עגול במידה גדולה יותר (L/XL) רק כדי לסדר ולפתוח, ללא הרמה אגרסיבית נוספת.

3. קביעת מידה (Size - S, M, L, XL):
   - המידה נקבעת לפי אורך הריס הטבעי ביחס לשתל (כלל ה-Dry Fit).
   - הריס חייב להגיע לכ-70%-80% מגובה השתל.
   - אם הריס ארוך מאוד (כמעט מגיע לקצה השתל), המידה חייבת להיות L או XL כדי למנוע קיפול לאחור (Over-curl).
   - אם הריס קצר, המידה חייבת להיות S.
   - לעולם אל תמליץ על מידה S לריסים ארוכים.

=========================================
נתיב 1: ניתוח עין והתאמת שתל
=========================================
אם התמונה היא של עין (Eye), החזר את המבנה הבא:
{
  "type": "eye_analysis",
  "data": {
    "eye_analysis": {
      "eyelid_structure": "[מבנה העפעף שזוהה: נפול / בולט / שקוע / רגיל]",
      "growth_direction": "[כיוון צמיחה: מטה / ישר / מעלה]",
      "lash_length": "[אורך ריס: קצר / בינוני / ארוך]"
    },
    "recommendation": {
      "shield_type": "[סוג השתל המומלץ: עגול / שטוח / משולב]",
      "shield_size": "[מידה מומלצת: S/M/L/XL]",
      "reasoning": "[הסבר המבוסס בדיוק על חוקי הברזל מעלה. למשל: מכיוון שהעפעף נפול, נבחר בשתל עגול כדי להרחיק את הריס מהעור]"
    },
    "processing_notes": "[הערות לגבי זמן המתנה בהתאם לעובי השערה]"
  }
}

=========================================
נתיב 2: זיהוי שתל
=========================================
אם התמונה היא של שתל סיליקון בלבד (Shield), החזר את המבנה הבא:
{
  "type": "shield_identification",
  "data": {
    "shield_identification": {
      "identified_type": "[עגול (Rounded) / שטוח (Flat/Lift) / משולב (Hybrid)]",
      "visual_clues": "[הסימנים. למשל: בטן עמוקה, בסיס שטוח וכו']"
    },
    "suitability": {
      "best_for_eyes": "[לאיזה מבנה עין השתל הזה מתאים לפי חוקי הברזל]",
      "best_for_lashes": "[לאיזה סוג וצמיחת ריס השתל מתאים]"
    }
  }
}

פורמט פלט (JSON מחמיר): החזר אך ורק JSON תקין. כל הערכים יהיו בעברית.
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
                    text: SYSTEM_PROMPT
                },
                {
                    type: 'text',
                    text: prompt
                },
                {
                    type: 'image',
                    data: req.file.buffer.toString('base64'),
                    mime_type: req.file.mimetype
                }
            ]
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

app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
