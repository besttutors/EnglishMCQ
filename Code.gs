// ╔══════════════════════════════════════════════════════════════╗
// ║   GrammarQuest — Google Apps Script API                     ║
// ║   File: Code.gs                                             ║
// ║                                                             ║
// ║   DEPLOY STEPS:                                             ║
// ║   1. Apps Script editor → Deploy → New Deployment           ║
// ║   2. Type: Web App                                          ║
// ║   3. Execute as: Me                                         ║
// ║   4. Who has access: Anyone                                 ║
// ║   5. Copy the Web App URL → paste in quiz HTML              ║
// ╚══════════════════════════════════════════════════════════════╝

// ── CONFIG — Sirf yahi ek cheez change karni hai ────────────────
const CONFIG = {
  SPREADSHEET_ID  : 'YOUR_SPREADSHEET_ID_HERE',  // Sheet URL se copy karo
  SHEET_QUESTIONS : 'Questions',
  SHEET_SCORES    : 'Leaderboard',
  CACHE_TTL       : 300,   // seconds (5 min server-side cache)
};

// ── COLUMN INDEX (1-based) ──────────────────────────────────────
const C = {
  ID:1, QUESTION:2, HINDI:3,
  OPT_A:4, OPT_B:5, OPT_C:6, OPT_D:7,
  CORRECT:8, EXPLANATION:9, HINT:10,
  CATEGORY:11, ACTIVE:12, DIFFICULTY:13,
};

// ═══════════════════════════════════════════════════════════════
//  doGet — GET requests handle karo
//  ?action=questions        → all active questions
//  ?action=leaderboard      → top 10 scores
//  ?action=ping             → health check
// ═══════════════════════════════════════════════════════════════
function doGet(e) {
  const p      = (e && e.parameter) ? e.parameter : {};
  const action = p.action || 'questions';

  let result;
  try {
    if      (action === 'questions'  ) result = handleGetQuestions();
    else if (action === 'leaderboard') result = handleGetLeaderboard();
    else if (action === 'ping'       ) result = { ok: true, ts: new Date().toISOString() };
    else                               result = { error: 'Unknown action' };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
//  doPost — POST requests handle karo
//  body { action:'saveScore', ... }
//  body { action:'addQuestion', ... }   ← admin use
// ═══════════════════════════════════════════════════════════════
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(_) {}

  let result;
  try {
    if      (body.action === 'saveScore'  ) result = handleSaveScore(body);
    else if (body.action === 'addQuestion') result = handleAddQuestion(body);
    else                                    result = { error: 'Unknown POST action' };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
//  handleGetQuestions
// ═══════════════════════════════════════════════════════════════
function handleGetQuestions() {
  // 1. Server-side cache check karo
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'gq_questions_v1';
  const cached   = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Sheet open karo
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_QUESTIONS);
  if (!sheet) return { error: '"Questions" sheet nahi mila. setupSheet() chalao.' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { questions: [], total: 0 };

  // 3. Saari data ek baar mein read karo (efficient)
  const rows = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

  const ansMap = { A:0, B:1, C:2, D:3 };
  const questions = [];

  rows.forEach(function(row) {
    // Active column check
    const active = row[C.ACTIVE - 1];
    if (active === false || String(active).toUpperCase() === 'FALSE') return;

    // Correct answer index
    const letter = String(row[C.CORRECT - 1]).toUpperCase().trim();
    const ansIdx = ansMap[letter];
    if (ansIdx === undefined) return; // malformed row skip

    // Question text validate karo
    const qText = String(row[C.QUESTION - 1]).trim();
    if (!qText) return;

    questions.push({
      id  : row[C.ID - 1]          || questions.length + 1,
      q   : qText,
      hi  : String(row[C.HINDI - 1]        || '').trim(),
      o   : [
              String(row[C.OPT_A - 1]).trim(),
              String(row[C.OPT_B - 1]).trim(),
              String(row[C.OPT_C - 1]).trim(),
              String(row[C.OPT_D - 1]).trim(),
            ],
      a   : ansIdx,
      e   : String(row[C.EXPLANATION - 1]  || '').trim(),
      h   : String(row[C.HINT - 1]         || '').trim(),
      c   : String(row[C.CATEGORY - 1]     || 'General').trim(),
      diff: String(row[C.DIFFICULTY - 1]   || 'Medium').trim(),
    });
  });

  const result = {
    questions : questions,
    total     : questions.length,
    fetchedAt : new Date().toISOString(),
    source    : 'google_sheets',
  };

  // 4. Cache mein save karo
  try {
    cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE_TTL);
  } catch(_) { /* ignore if too large */ }

  return result;
}

// ═══════════════════════════════════════════════════════════════
//  handleGetLeaderboard
// ═══════════════════════════════════════════════════════════════
function handleGetLeaderboard() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_SCORES);
  if (!sheet || sheet.getLastRow() < 2) return { leaderboard: [] };

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();

  const lb = rows
    .filter(function(r) { return r[0]; })
    .map(function(r) {
      return {
        name   : String(r[0]).trim(),
        score  : Number(r[1]) || 0,
        grade  : String(r[2] || '').trim(),
        pct    : Number(r[3]) || 0,
        streak : Number(r[4]) || 0,
        correct: Number(r[5]) || 0,
        date   : r[6] ? new Date(r[6]).toLocaleDateString('en-IN') : '',
      };
    })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 10);

  return { leaderboard: lb };
}

// ═══════════════════════════════════════════════════════════════
//  handleSaveScore
// ═══════════════════════════════════════════════════════════════
function handleSaveScore(body) {
  if (!body.name || body.score === undefined) {
    return { error: 'name aur score required hain' };
  }

  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(CONFIG.SHEET_SCORES);

  // Sheet nahi hai toh banao
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_SCORES);
    const hdrs = ['Name','Score','Grade','Percent %','Best Streak','Correct','Wrong','Skipped','Date'];
    sheet.appendRow(hdrs);
    sheet.getRange(1,1,1,hdrs.length)
         .setFontWeight('bold')
         .setBackground('#1a1a2e')
         .setFontColor('#6ee7f7');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    String(body.name || 'Anonymous').substring(0, 30),
    Number(body.score)   || 0,
    String(body.grade)   || '-',
    Number(body.pct)     || 0,
    Number(body.streak)  || 0,
    Number(body.correct) || 0,
    Number(body.wrong)   || 0,
    Number(body.skipped) || 0,
    new Date(),
  ]);

  return { success: true, message: 'Score save ho gaya!' };
}

// ═══════════════════════════════════════════════════════════════
//  handleAddQuestion — Admin ke liye (POST se naya question add)
// ═══════════════════════════════════════════════════════════════
function handleAddQuestion(body) {
  const required = ['q','optA','optB','optC','optD','correct'];
  for (var i = 0; i < required.length; i++) {
    if (!body[required[i]]) return { error: required[i] + ' required hai' };
  }

  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_QUESTIONS);
  if (!sheet) return { error: 'Questions sheet nahi mila' };

  const newId = sheet.getLastRow();
  sheet.appendRow([
    newId,
    String(body.q),
    String(body.hi         || ''),
    String(body.optA),
    String(body.optB),
    String(body.optC),
    String(body.optD),
    String(body.correct).toUpperCase(),
    String(body.explanation || ''),
    String(body.hint        || ''),
    String(body.category    || 'General'),
    true,
    String(body.difficulty  || 'Medium'),
  ]);

  // Cache bust karo taaki naya question dikhne lage
  CacheService.getScriptCache().remove('gq_questions_v1');

  return { success: true, id: newId, message: 'Question add ho gaya!' };
}

// ═══════════════════════════════════════════════════════════════
//  setupSheet() ← PEHLI BAAR MANUALLY RUN KARO
//  Yeh function sheet ka poora structure aur sample data banata hai
// ═══════════════════════════════════════════════════════════════
function setupSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // ─── Questions Sheet ───────────────────────────────────────
  var qSheet = ss.getSheetByName(CONFIG.SHEET_QUESTIONS);
  if (qSheet) ss.deleteSheet(qSheet);
  qSheet = ss.insertSheet(CONFIG.SHEET_QUESTIONS);

  // Headers
  var headers = [
    'ID', 'Question (English)', 'Hindi Translation',
    'Option A', 'Option B', 'Option C', 'Option D',
    'Correct (A/B/C/D)', 'Explanation', 'Hint',
    'Category', 'Active (TRUE/FALSE)', 'Difficulty'
  ];
  qSheet.appendRow(headers);
  qSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a1a2e')
        .setFontColor('#6ee7f7')
        .setFontSize(10);
  qSheet.setFrozenRows(1);

  // Column widths
  qSheet.setColumnWidth(2, 340);
  qSheet.setColumnWidth(3, 220);
  qSheet.setColumnWidth(4, 160); qSheet.setColumnWidth(5, 160);
  qSheet.setColumnWidth(6, 160); qSheet.setColumnWidth(7, 160);
  qSheet.setColumnWidth(8, 110);
  qSheet.setColumnWidth(9, 300);
  qSheet.setColumnWidth(10, 200);
  qSheet.setColumnWidth(11, 140);

  // ── 30 Sample Questions ──────────────────────────────────
  var sampleData = [
    [1,'Which of the following is a noun?','निम्नलिखित में से कौन सा संज्ञा है?','Run','Beautiful','Happiness','Quickly','C',"'Happiness' is an abstract noun. संज्ञा वह शब्द जो किसी व्यक्ति/स्थान/भाव का नाम बताता है।",'It names a feeling or state of mind.','Parts of Speech',true,'Easy'],
    [2,'Identify the verb in: She sings beautifully.','क्रिया पहचानें।','She','Sings','Beautifully','All of these','B',"'Sings' is the action verb.",'Look for the action or state word.','Parts of Speech',true,'Easy'],
    [3,'Which word is an adjective?','कौन सा शब्द विशेषण है?','Dance','Clever','Softly','Into','B',"'Clever' describes a quality — it is an adjective.",'Adjectives describe nouns.','Parts of Speech',true,'Easy'],
    [4,'What part of speech is "quickly"?','"quickly" कौन सा शब्दभेद है?','Noun','Verb','Adjective','Adverb','D',"'Quickly' modifies a verb — it is an adverb.",'How something is done = Adverb.','Parts of Speech',true,'Easy'],
    [5,"Choose correct Simple Present: 'She ___ every morning.'",'सही Simple Present चुनें।','run','runs','ran','running','B','3rd person singular (she/he/it) → add -s/-es.','He/She/It takes -s or -es.','Tenses',true,'Easy'],
    [6,"Identify tense: 'They have finished their homework.'",'काल पहचानें।','Simple Past','Present Perfect','Past Perfect','Simple Present','B','Have/Has + past participle = Present Perfect.','Have + V3 = Present Perfect.','Tenses',true,'Medium'],
    [7,"'He was reading when I arrived.' — tense of 'was reading':",'काल।','Past Perfect','Past Perfect Continuous','Past Continuous','Simple Past','C','Was/Were + V-ing = Past Continuous.','Ongoing action in past.','Tenses',true,'Medium'],
    [8,"Choose correct: 'I ___ here since 2015.'",'सही विकल्प।','live','lived','have lived','am living','C',"'Since' (point of time) → Present Perfect.",'Since = from a past point to now.','Tenses',true,'Medium'],
    [9,"'___ umbrella was left behind.'",'सही article।','A','An','The','No article','B',"'An' before vowel sounds. Umbrella starts with /ʌ/.",'Umbrella starts with a vowel SOUND.','Articles',true,'Easy'],
    [10,"'She plays ___ piano.'",'सही article।','a','an','the','no article','C',"'The' is used with musical instruments.",'Musical instruments always use THE.','Articles',true,'Easy'],
    [11,"'He wants to become ___ engineer.'",'सही article।','a','an','the','no article','B',"'An' before vowel sounds — engineer starts with /ɛ/.",'Engineer starts with vowel sound.','Articles',true,'Easy'],
    [12,"'Man is ___ mortal.'",'सही article।','a','an','the','no article','D','No article with abstract general nouns in universal truth.','Universal truths — no article needed.','Articles',true,'Medium'],
    [13,"'Mathematics ___ my favourite subject.'",'सही रूप।','are','were','is','have','C','Subject names ending in -s take singular verb.','Mathematics/Physics/News = singular.','Agreement',true,'Medium'],
    [14,"'Each of the students ___ given a book.'",'सही रूप।','were','are','has been','have been','C',"'Each' always takes singular verb.",'Each, Every = singular verb.','Agreement',true,'Medium'],
    [15,"Change to passive: 'She writes a letter.'",'Passive voice।','A letter writes by her.','A letter is written by her.','A letter was written by her.','A letter has been written by her.','B','Present Active → Passive: is/am/are + past participle.','is/am/are + V3 + by.','Voice',true,'Medium'],
    [16,"Change to passive: 'Open the door.' (imperative)",'Passive voice।','The door was opened.','Let the door be opened.','The door is opened.','The door should open.','B','Imperative → Passive: Let + object + be + V3.','Let + object + be + past participle.','Voice',true,'Hard'],
    [17,"He said, 'I am happy.' Indirect speech:",'Indirect speech।','He said that he was happy.','He said that I am happy.','He told that he was happy.','He said that he is happy.','A',"'Am' → 'was' (backshift). 'I' → 'he'.",'Present backshifts to past in indirect.','Narration',true,'Medium'],
    [18,"'Is she coming?' he asked. Indirect:",'Indirect speech।','He asked if she was coming.','He asked that she was coming.','He asked whether she is coming.','He asked was she coming.','A','Yes/No questions: if/whether + subject + verb order.','Yes/No questions use if or whether.','Narration',true,'Medium'],
    [19,"'You ___ respect your elders.' (obligation)",'सही modal।','can','may','must','might','C','Must = strong obligation/necessity.','Strong duty/necessity = must.','Modals',true,'Easy'],
    [20,"'It ___ rain today.' (possibility)",'सही modal।','must','shall','might','will','C','Might = less certain possibility.','Possibility = might/may.','Modals',true,'Easy'],
    [21,"'___ you please help me?' (polite request)",'सही modal।','May','Must','Could','Should','C',"'Could' is used for polite requests.",'Polite requests = Could.','Modals',true,'Easy'],
    [22,"'If it rains, I ___ stay home.' Type 1",'Type 1 Conditional।','will','would','had','have','A','Type 1: If + Simple Present → will + base verb.','Real/possible future condition.','Conditionals',true,'Medium'],
    [23,"'If I were rich, I ___ travel the world.' Type 2",'Type 2 Conditional।','will','would','had','should','B','Type 2: If + Past Simple → would + base verb.','Unreal present situation.','Conditionals',true,'Medium'],
    [24,"'He has been working ___ morning.'",'सही preposition।','from','since','for','by','B',"'Since' for a point of time (morning/Monday/2019).",'Point of time = since.','Prepositions',true,'Easy'],
    [25,"'She has been working ___ two hours.'",'सही preposition।','since','for','from','at','B',"'For' for a period of time (two hours/three days).",'Period of time = for.','Prepositions',true,'Easy'],
    [26,"'She is good ___ mathematics.'",'सही preposition।','in','at','on','for','B',"'Good at' is a fixed collocation.",'Fixed phrase: good AT something.','Prepositions',true,'Easy'],
    [27,"Find error: 'He did not went to school yesterday.'",'गलती पहचानें।','He did not','went','to school','yesterday','B','After did not, use BASE form: go (not went).','did not + base verb (no past tense).','Error Detection',true,'Medium'],
    [28,"'Beat about the bush' means:",'इसका अर्थ।','To hit bushes','To avoid the main topic','To work hard','To run fast','B','To avoid the main topic; to be indirect.','Not getting to the point directly.','Idioms',true,'Easy'],
    [29,"Synonym of 'Benevolent':",'पर्यायवाची।','Cruel','Kind','Brave','Proud','B',"'Benevolent' means kind and generous.",'Bene = good (Latin root).','Vocabulary',true,'Easy'],
    [30,"Comparative of 'Good':",'Comparative degree।','Gooder','Better','More good','Best','B','Good → Better → Best (irregular comparison).','Completely irregular — memorise it.','Degrees',true,'Easy'],
  ];

  qSheet.getRange(2, 1, sampleData.length, 13).setValues(sampleData);

  // Alternate row colors
  for (var i = 0; i < sampleData.length; i++) {
    var color = (i % 2 === 0) ? '#0d1220' : '#0a0f1a';
    qSheet.getRange(i + 2, 1, 1, 13).setBackground(color).setFontColor('#c8d0e8');
  }

  // ─── Settings Sheet ────────────────────────────────────────
  var sSheet = ss.getSheetByName('Settings');
  if (!sSheet) sSheet = ss.insertSheet('Settings');
  else sSheet.clearContents();
  sSheet.appendRow(['Setting', 'Value', 'Description']);
  sSheet.appendRow(['quiz_title', 'GrammarQuest', 'Quiz ka naam']);
  sSheet.appendRow(['questions_per_test', 20, 'Ek test mein kitne questions']);
  sSheet.appendRow(['time_per_question', 30, 'Har question ke liye seconds']);
  sSheet.appendRow(['welcome_message', 'Learn English Grammar with fun!', 'Welcome screen message']);
  sSheet.getRange(1,1,1,3).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#6ee7f7');
  sSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert(
    '✅ Sheet setup complete!\n\n' +
    '30 sample questions add ho gaye.\n\n' +
    'Ab Deploy karein:\n' +
    'Deploy → New Deployment → Web App\n' +
    'Execute as: Me | Access: Anyone'
  );
}
