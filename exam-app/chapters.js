/* AiCVD 模擬考：把每一題歸到 Muller & Kirk's Small Animal Dermatology 7e 的章節（建置時使用）
 *
 * 歸類順序：
 *   1. 題目標頭寫了 mk=8（或 mk=H／F／X／S），就照寫的。
 *   2. 馬、經濟動物、特寵與研究方法題目不在 Muller 範圍內，分到 H／F／X／S。
 *   3. 參考文獻寫了「Muller & Kirk 7e Ch.N」，照章號；引用多章時取關鍵字分數最高的一章。
 *   4. 其餘依標籤、題幹、選項與解析的關鍵字計分，取最高分的章。
 *
 * 自動判斷有誤時，在題目標頭加 mk= 修正即可。
 */
'use strict';

const NAMES = {
  1: '皮膚構造與功能', 2: '診斷方法', 3: '皮膚治療學', 4: '細菌性皮膚病', 5: '黴菌與藻類皮膚病',
  6: '寄生蟲皮膚病', 7: '病毒、立克次體與原蟲', 8: '過敏性疾病', 9: '自體免疫與免疫媒介', 10: '內分泌與代謝',
  11: '其他脫毛症', 12: '先天與遺傳性疾病', 13: '色素異常', 14: '角化異常', 15: '心因性皮膚病',
  16: '環境性皮膚病', 17: '營養性皮膚病', 18: '其他皮膚病', 19: '眼瞼、爪、肛門囊與耳', 20: '腫瘤與非腫瘤性腫塊',
  H: '馬（Muller 未涵蓋）', F: '經濟動物（Muller 未涵蓋）', X: '特寵（Muller 未涵蓋）', S: '研究方法與其他（Muller 未涵蓋）',
};

// 每章的關鍵字（每個詞都從字首比對，不分大小寫）
const KEYWORDS = {
  1: 'structure and function|epidermis|dermis\\b|keratinocyte|corneocyte|stratum|basement membrane|hair follicle|hair cycle|anagen|catagen|telogen|sebaceous|apocrine|epitrichial|eccrine|wound healing|langerhans|merkel|arrector|desmosome|hemidesmosome|filaggrin|cornified envelope|lipid lamellae|ceramide|cutaneous vasculature|thermoregulation|skin barrier|basic histology|inner root sheath|hair shaft|keratin\\b|keratins|mechanoreceptor|innervation',
  2: 'diagnostic method|section(ing)?|floater|contaminat|processing|fixation|biopsy technique|skin biopsy|artefact|artifact|trichogram|skin scraping|tape impression|acetate tape|cytology technique|wood.?s lamp|culture technique|direct immunofluorescence technique|fine.?needle|punch biopsy|formalin|stain(ing)? technique|special stain|immunohistochemistry technique|intradermal test|serolog|allergen.?specific ige',
  3: 'ciclosporin|atinvicitinib|maropitant|cyclosporine|glucocorticoid|prednisolone|oclacitinib|lokivetmab|ilunocitinib|antihistamine|shampoo|topical therapy|keratolytic|keratoplastic|isoxazoline|ivermectin|amitraz|antibiotic|antimicrobial therap|cephalexin|cefovecin|clindamycin|fluoroquinolone|azole|itraconazole|terbinafine|pharmacokinetic|drug interaction|adverse effect|immunotherapy|allergen.?specific immunotherapy|mycophenolate|azathioprine|chlorambucil|pentoxifylline|tetracycline|niacinamide|tacrolimus|retinoid|vitamin a\\b|essential fatty|fatty acid supplement|melatonin|trilostane|mitotane',
  4: 'pyoderma|staphylococ|pseudintermedius|mrsp|methicillin|meticillin|pseudomonas|bacterial|mycobacter|leproid|nocardia|actinomyc|impetigo|folliculitis|furunculosis|cellulitis|abscess|bartonella|dermatophilus|botryomycosis|l.?form|anaerob|plague|yersinia|tularemia|leptospir',
  5: 'dermatophyt|microsporum|trichophyton|ringworm|malassezia|candida|sporotrich|cryptococc|blastomyc|histoplasm|coccidioid|aspergill|pythio|lagenid|zygomyc|mucor|phaeohyphomyc|eumycot|mycetoma|pseudomycetoma|protothec|algal|fungal|fung',
  6: 'demodex|demodicosis|sarcopt|scabies|notoedr|otodect|cheyletiell|lynxacarus|tick|flea|ctenocephal|lice|pediculosis|trichodect|felicola|mosquito|myiasis|cuterebra|trombicul|chigger|pelodera|hookworm|dirofilari|dracunculus|parasit|acaricid|ectoparasit|straelensia|fly strike|simulium|otobius|spider|ant\\b',
  7: 'virus|viral|papilloma|herpes|fhv|calicivir|poxvir|cowpox|distemper|felv|fiv\\b|leishman|protozo|rickettsi|ehrlichi|anaplasm|toxoplasm|neospor|babesi|trypanosom|caninum|mpox|monkeypox',
  8: 'atopic|atopy|cad\\b|cadesi|pvas|food allergy|adverse food|cafr|elimination diet|flea allergy|fad\\b|hypersensitivity|allergic|allergen|ige\\b|mast cell degranul|pruritus|itch|il.?31|contact dermatitis|urticaria|angioedema|eosinophil|insect.?bite|culicoides|gell and coombs|histamine|cytokine|th2|immune system|innate immun|adaptive immun|dendritic cell|t cell',
  9: 'pemphig|lupus|dle\\b|sle\\b|cle\\b|erythema multiforme|toxic epidermal|stevens|vasculitis|graft.?versus.?host|gvhd|fixed drug|interface dermatitis|vasculopathy|ischaemic|ischemic|dermatomyositis|uveodermatolog|vkh|vitiligo|alopecia areata|trichomalacia|pseudopelade|cold agglutinin|drug eruption|adverse drug|autoimmun|immune.?mediated|direct immunofluorescence|epidermolysis bullosa acquisita|sterile pyogranulom|sterile granulom|histiocytosis|lupoid onychodystrophy|onychodystrophy|proliferative arteritis|plasma cell pododermatitis|juvenile cellulitis|sterile nodular|vaccine.?associated|rabies vaccine',
  10: 'hypothyroid|hyperadrenocortic|cushing|hypercortisol|alopecia x|hyperoestrogen|hyperestrogen|sertoli|testicular|granulosa|ovarian|oestrogen|estrogen|growth hormone|pituitary dwarf|acromegal|diabetes|hepatocutaneous|superficial necrolytic|metabolic epidermal|calcinosis cutis|endocrin|hyperthyroid|sex hormone|feline paraneoplastic alopecia|xanthoma',
  11: 'recurrent flank|seasonal flank|cyclic flank|post.?clipping|pattern baldness|pinnal alopecia|telogen effluvium|anagen defluxion|traction alopecia|injection.?site alopecia|follicular dysplasia|colou?r dilution|black hair|hair cycle arrest|acquired alopecia|alopecia\\b',
  12: 'congenital|hereditary|inherited|genetic|genodermat|ichthyosis|epidermolysis bullosa(?! acquisita)|ehlers|dermatosparaxis|cutaneous asthenia|ectodermal dysplasia|dermoid sinus|aplasia cutis|hypotrichosis|mutation|breed predisposition|familial|gene\\b|pnpla1|slc27a4|lamc2|col7a1|krt|foxi3|adamts2',
  13: 'pigment|coat colou?r|melan(in|ocyte|ogenesis|osis)|tyrosinase|lentigo|hyperpigment|hypopigment|depigment|leukotrichia|leukoderma|snow nose|nasal hypopigment|eumelanin|pheomelanin',
  14: 'keratinization|keratinisation|seborrh|ichthyos|follicular keratosis|comedo|schnauzer comedo|sebaceous adenitis|vitamin a.?responsive|nasodigital|digital hyperkeratosis|nasal hyperkeratosis|ear margin|footpad hyperkeratosis|lichenoid|psoriasiform|epidermal dysplasia|callus|acne',
  15: 'psychogenic|behavio|acral lick|lick granuloma|compulsive|tail.?chas|flank sucking|feline psychogenic|anxiety|neuropathic|feline hyperesthesia|hyperaesthesia|self.?mutilat|sensory neuropathy|fluoxetine|clomipramine|naltrexone',
  16: 'solar|actinic|uv\\b|sunburn|burn|frostbite|thermal|chemical|radiation|irritant|pressure|callus|hygroma|decubitus|snake|envenom|spider|loxosc|bee|wasp|hymenopter|toad|caterpillar|thallium|arsenic|mercury|foreign body|grass awn|quill|environmental|bandage|electrical',
  17: 'nutrition|zinc|vitamin e|steatitis|pansteatitis|fatty acid deficien|protein deficien|generic dog food|copper deficien|vitamin a deficien|biotin|riboflavin|diet\\b|home.?prepared|raw (pet )?food',
  18: 'miscellaneous|sterile nodular|panniculitis|eosinophilic granuloma|eosinophilic plaque|indolent ulcer|feline eosinophilic|sterile|granulomatous|pyogranulom|calcinosis circumscripta|tumoral calcinosis|lymphoplasmacytic|plasma cell|idiopathic|ulcerative dermatitis|mucinosis|fibropruritic|cutaneous lymphocytosis|perianal fistula|anal furunculosis|feline idiopathic ulcerative|sterile pustular',
  19: 'otitis|ear canal|pinna|pinnal|tympan|bulla|ceruminous|cerumen|aural|ototox|teca|lbo|eyelid|blephar|claw|nail|onycho|paronych|anal sac|anal gland|facial nerve|ear margin|ear\\b',
  20: 'tumou?r|acanthoma|granular cell|neuroma|hibernoma|neoplas|carcinoma|sarcoma|lymphoma|mycosis fungoides|epitheliotropic|mast cell tumou?r|mct\\b|melanoma|histiocytoma|plasmacytoma|papilloma|adenoma|epithelioma|trichoblastoma|trichoepithelioma|cyst|hamartoma|malformation|nevus|naevus|lipoma|hemangio|haemangio|fibrosarcoma|injection.?site sarcoma|paraneoplastic|thymoma|grade|margin|chemotherap|lomustine|toceranib|cytology of tumou?r|round cell|spindle cell',
};
const RX = Object.fromEntries(Object.entries(KEYWORDS).map(([c, s]) => [c, new RegExp('\\b(?:' + s + ')', 'gi')]));

// 領域對章節的加分
const PRIOR = {
  SF: { 1: 2, 12: 0.5, 13: 0.5, 14: 0.5 }, IMM: { 8: 1.5, 9: 1.5 }, MIC: { 4: 1, 5: 1, 7: 1 }, PAR: { 6: 3 }, OTO: { 19: 3 },
  IMO: { 10: 1.5, 20: 1.5 }, GEN: { 12: 3 }, NEB: { 15: 1, 16: 1, 17: 1 }, PHA: { 3: 3 }, CLP: { 2: 2 },
};

// 標籤一看就知道章節的情況，直接決定
const TAG_RULES = [
  [/leishman/i, 7], [/zinc/i, 17], [/pancreatic panniculitis|sterile nodular panniculitis/i, 18],
  [/drug eruption|graft-versus-host/i, 9], [/otitis|ear canal/i, 19], [/demodic|sarcopt|flea(?! allergy)/i, 6],
];

function scores(q) {
  const tags = q.tags.join(' ');
  const body = [q.Q, (q.opts || []).join(' '), q.opts ? q.opts[q.answer] : '', (q.subs || []).map((s) => s.t + ' ' + s.k.join(' ')).join(' '), q.img || ''].join(' ');
  const x = q.X || '';
  const count = (s, re) => (s.match(re) || []).length;
  const sc = {};
  for (const c in RX) sc[c] = count(tags, RX[c]) * 3 + count(body, RX[c]) + Math.min(count(x, RX[c]) * 0.4, 3) + ((PRIOR[q.dom] || {})[c] || 0);
  return sc;
}

// 回傳章節代碼字串：'1'–'20'，或 'H'／'F'／'X'／'S'
function chapterOf(q) {
  if (q.mk && NAMES[q.mk]) return String(q.mk);
  if (q.sp === 'horse') return 'H';
  if (q.sp === 'farm') return 'F';
  if (q.sp === 'exotic') return 'X';
  if (q.sp === 'human' || q.dom === 'RES') return 'S';
  const refs = q.R.join(' ');
  const cited = [];
  for (const s of refs.match(/Muller\s*(?:&|and)\s*Kirk[^;；]*/gi) || []) {
    for (const c of s.match(/Ch\.?\s*\d+/gi) || []) {
      const n = Number(c.replace(/\D/g, ''));
      if (n >= 1 && n <= 20 && !cited.includes(n)) cited.push(n);
    }
    if (!cited.length && /心因性/.test(s)) cited.push(15);
  }
  const sc = scores(q);
  if (cited.length) return String(cited.sort((a, b) => sc[b] - sc[a])[0]);
  const tags = q.tags.join(' ');
  for (const [re, c] of TAG_RULES) if (re.test(tags)) return String(c);
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}

module.exports = { NAMES, chapterOf };
