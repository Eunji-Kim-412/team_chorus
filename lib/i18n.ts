/* ──────────────────────────────────────────────
   메인 페이지 데모용 데이터 i18n
   - 이름(반려동물/보호자): 한글 → 로마자 음역
   - 전문용어(견종/백신/수술/약품/재내원 사유): 의미 번역
─────────────────────────────────────────────── */
export type UiLang = "ko" | "en" | "zh" | "fr";

/* ===== 한글 로마자 변환 (개정 로마자 표기, 음절 단위) ===== */
const LEAD = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const TAIL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

// 흔히 쓰는 성씨 표기 (개정 로마자와 다른 관용 표기)
const SURNAME: Record<string, string> = {
  이: "Lee", 김: "Kim", 박: "Park", 최: "Choi", 정: "Jung", 강: "Kang", 윤: "Yoon", 임: "Lim", 송: "Song", 한: "Han",
  오: "Oh", 배: "Bae", 신: "Shin", 류: "Ryu", 황: "Hwang", 전: "Jeon", 고: "Ko", 백: "Baek", 노: "Noh", 장: "Jang",
  권: "Kwon", 문: "Moon", 양: "Yang", 조: "Cho", 서: "Seo", 남: "Nam", 안: "Ahn", 성: "Sung", 하: "Ha", 천: "Cheon",
  방: "Bang", 엄: "Eom", 표: "Pyo", 금: "Geum", 탁: "Tak", 위: "Wi", 구: "Koo", 심: "Sim", 피: "Pi", 진: "Jin",
  라: "Ra", 도: "Do", 예: "Ye", 사: "Sa", 기: "Ki", 공: "Kong", 음: "Eum", 당: "Dang", 유: "Yoo", 허: "Heo", 지: "Ji",
};

function romanizeChar(ch: string): string {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return ch; // 한글 음절이 아니면 그대로
  const lead = Math.floor(code / 588);
  const vowel = Math.floor((code % 588) / 28);
  const tail = code % 28;
  return LEAD[lead] + VOWEL[vowel] + TAIL[tail];
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function romanizeWord(word: string): string {
  let out = "";
  for (const ch of word) out += romanizeChar(ch);
  return capitalize(out);
}

/** 반려동물 이름: 한 단어 음역 */
export function translatePetName(name: string, lang: UiLang): string {
  if (lang === "ko" || !name) return name;
  return romanizeWord(name);
}

/** 보호자 이름: 성(姓) + 이름 → "Surname Given" */
export function translateOwnerName(name: string, lang: UiLang): string {
  if (lang === "ko" || !name) return name;
  const chars = [...name];
  if (chars.length < 2) return romanizeWord(name);
  const surnameCh = chars[0];
  const given = chars.slice(1).join("");
  const surname = SURNAME[surnameCh] ?? capitalize(romanizeChar(surnameCh));
  return `${surname} ${romanizeWord(given)}`;
}

/* ===== 전문용어 의미 번역 사전 ===== */
type Trio = { en: string; zh: string; fr: string };

const TERMS: Record<string, Trio> = {
  // ── 견종(품종)
  푸들: { en: "Poodle", zh: "贵宾犬", fr: "Caniche" },
  말티즈: { en: "Maltese", zh: "马尔济斯", fr: "Bichon maltais" },
  시츄: { en: "Shih Tzu", zh: "西施犬", fr: "Shih Tzu" },
  비숑프리제: { en: "Bichon Frise", zh: "比熊犬", fr: "Bichon frisé" },
  웰시코기: { en: "Welsh Corgi", zh: "柯基犬", fr: "Corgi gallois" },
  멕시코기: { en: "Welsh Corgi", zh: "柯基犬", fr: "Corgi gallois" },
  진돗개: { en: "Jindo", zh: "珍岛犬", fr: "Jindo" },
  골든리트리버: { en: "Golden Retriever", zh: "金毛寻回犬", fr: "Golden Retriever" },
  포메라니안: { en: "Pomeranian", zh: "博美犬", fr: "Spitz nain" },
  치와와: { en: "Chihuahua", zh: "吉娃娃", fr: "Chihuahua" },
  닥스훈트: { en: "Dachshund", zh: "腊肠犬", fr: "Teckel" },
  불독: { en: "Bulldog", zh: "斗牛犬", fr: "Bouledogue" },
  퍼그: { en: "Pug", zh: "巴哥犬", fr: "Carlin" },
  보스턴테리어: { en: "Boston Terrier", zh: "波士顿梗", fr: "Boston Terrier" },
  프렌치불독: { en: "French Bulldog", zh: "法国斗牛犬", fr: "Bouledogue français" },
  비글: { en: "Beagle", zh: "比格犬", fr: "Beagle" },
  코커스패니얼: { en: "Cocker Spaniel", zh: "可卡犬", fr: "Cocker" },
  요크셔테리어: { en: "Yorkshire Terrier", zh: "约克夏梗", fr: "Yorkshire Terrier" },
  미니어처슈나우저: { en: "Miniature Schnauzer", zh: "迷你雪纳瑞", fr: "Schnauzer nain" },
  사모예드: { en: "Samoyed", zh: "萨摩耶", fr: "Samoyède" },
  허스키: { en: "Husky", zh: "哈士奇", fr: "Husky" },
  라브라도리트리버: { en: "Labrador Retriever", zh: "拉布拉多", fr: "Labrador" },
  저먼셰퍼드: { en: "German Shepherd", zh: "德国牧羊犬", fr: "Berger allemand" },
  로트와일러: { en: "Rottweiler", zh: "罗威纳", fr: "Rottweiler" },
  도베르만: { en: "Doberman", zh: "杜宾犬", fr: "Dobermann" },
  복서: { en: "Boxer", zh: "拳师犬", fr: "Boxer" },
  그레이트데인: { en: "Great Dane", zh: "大丹犬", fr: "Dogue allemand" },
  달마시안: { en: "Dalmatian", zh: "斑点狗", fr: "Dalmatien" },
  차우차우: { en: "Chow Chow", zh: "松狮犬", fr: "Chow-chow" },
  아키타: { en: "Akita", zh: "秋田犬", fr: "Akita" },
  시바이누: { en: "Shiba Inu", zh: "柴犬", fr: "Shiba Inu" },
  페르시안: { en: "Persian", zh: "波斯猫", fr: "Persan" },
  러시안블루: { en: "Russian Blue", zh: "俄罗斯蓝猫", fr: "Bleu russe" },
  스코티시폴드: { en: "Scottish Fold", zh: "苏格兰折耳猫", fr: "Scottish Fold" },
  브리티시쇼트헤어: { en: "British Shorthair", zh: "英国短毛猫", fr: "British Shorthair" },
  메인쿤: { en: "Maine Coon", zh: "缅因猫", fr: "Maine Coon" },
  벵갈: { en: "Bengal", zh: "孟加拉猫", fr: "Bengal" },
  아비시니안: { en: "Abyssinian", zh: "阿比西尼亚猫", fr: "Abyssin" },
  이집션마우: { en: "Egyptian Mau", zh: "埃及猫", fr: "Mau égyptien" },
  버마: { en: "Burmese", zh: "缅甸猫", fr: "Burmese" },
  샴: { en: "Siamese", zh: "暹罗猫", fr: "Siamois" },

  // ── 백신
  "종합백신 (DHPPL)": { en: "Combination vaccine (DHPPL)", zh: "综合疫苗 (DHPPL)", fr: "Vaccin combiné (DHPPL)" },
  광견병: { en: "Rabies", zh: "狂犬病", fr: "Rage" },
  켄넬코프: { en: "Kennel Cough", zh: "犬窝咳", fr: "Toux de chenil" },
  코로나: { en: "Coronavirus", zh: "冠状病毒", fr: "Coronavirus" },
  인플루엔자: { en: "Influenza", zh: "流感", fr: "Grippe" },
  "심장사상충 예방": { en: "Heartworm prevention", zh: "心丝虫预防", fr: "Prévention du ver du cœur" },
  "종합백신+광견병": { en: "Combination + Rabies", zh: "综合疫苗+狂犬病", fr: "Combiné + Rage" },
  "FELV (고양이 백혈병)": { en: "FeLV (Feline Leukemia)", zh: "FeLV (猫白血病)", fr: "FeLV (leucémie féline)" },

  // ── 수술
  "중성화 수술": { en: "Neutering surgery", zh: "绝育手术", fr: "Stérilisation" },
  "슬개골 탈구 수술": { en: "Patellar luxation surgery", zh: "膝盖骨脱位手术", fr: "Chirurgie de luxation rotulienne" },
  발치: { en: "Tooth extraction", zh: "拔牙", fr: "Extraction dentaire" },
  "종양 제거": { en: "Tumor removal", zh: "肿瘤切除", fr: "Ablation de tumeur" },
  "위장 수술": { en: "Gastrointestinal surgery", zh: "胃肠手术", fr: "Chirurgie gastro-intestinale" },
  "정형외과 수술": { en: "Orthopedic surgery", zh: "骨科手术", fr: "Chirurgie orthopédique" },
  "안과 수술": { en: "Eye surgery", zh: "眼科手术", fr: "Chirurgie oculaire" },
  "피부 봉합": { en: "Skin suturing", zh: "皮肤缝合", fr: "Suture cutanée" },
  "귀 수술": { en: "Ear surgery", zh: "耳部手术", fr: "Chirurgie de l'oreille" },
  "비뇨기 수술": { en: "Urological surgery", zh: "泌尿手术", fr: "Chirurgie urologique" },
  "왼쪽 무릎 슬개골 탈구 교정술": { en: "Left knee patellar luxation correction", zh: "左膝膝盖骨脱位矫正术", fr: "Correction de luxation rotulienne du genou gauche" },

  // ── 약품(전문용어)
  진통제: { en: "Painkiller", zh: "止痛药", fr: "Analgésique" },
  항생제: { en: "Antibiotic", zh: "抗生素", fr: "Antibiotique" },
  소염제: { en: "Anti-inflammatory", zh: "消炎药", fr: "Anti-inflammatoire" },
  위장약: { en: "Gastrointestinal medication", zh: "胃肠药", fr: "Médicament gastro-intestinal" },
  스테로이드제: { en: "Steroid", zh: "类固醇", fr: "Stéroïde" },
  항히스타민제: { en: "Antihistamine", zh: "抗组胺药", fr: "Antihistaminique" },
  이뇨제: { en: "Diuretic", zh: "利尿剂", fr: "Diurétique" },
  심장약: { en: "Heart medication", zh: "心脏药", fr: "Médicament cardiaque" },
  갑상선약: { en: "Thyroid medication", zh: "甲状腺药", fr: "Médicament thyroïdien" },
  인슐린: { en: "Insulin", zh: "胰岛素", fr: "Insuline" },
  관절보조제: { en: "Joint supplement", zh: "关节补充剂", fr: "Complément articulaire" },

  // ── 재내원 사유
  "실밥 제거": { en: "Suture removal", zh: "拆线", fr: "Retrait des fils" },
  "정기 검진": { en: "Routine checkup", zh: "定期检查", fr: "Contrôle de routine" },
  "추가 접종": { en: "Booster vaccination", zh: "加强接种", fr: "Rappel de vaccin" },
  "혈액 검사": { en: "Blood test", zh: "血液检查", fr: "Analyse de sang" },
  "방사선 촬영": { en: "X-ray", zh: "X光检查", fr: "Radiographie" },
  "초음파 검사": { en: "Ultrasound", zh: "超声波检查", fr: "Échographie" },
  "피부 재진": { en: "Skin follow-up", zh: "皮肤复诊", fr: "Suivi dermatologique" },
  "눈 검사": { en: "Eye exam", zh: "眼睛检查", fr: "Examen oculaire" },
  "귀 청소": { en: "Ear cleaning", zh: "耳朵清洁", fr: "Nettoyage des oreilles" },
  "치과 스케일링": { en: "Dental scaling", zh: "洁牙", fr: "Détartrage" },
  "재내원 안내": { en: "Revisit notice", zh: "复诊通知", fr: "Avis de retour" },
  "종합 검진": { en: "Comprehensive checkup", zh: "综合检查", fr: "Bilan complet" },
  "심장 검사 추적": { en: "Cardiac follow-up", zh: "心脏检查随访", fr: "Suivi cardiaque" },
};

/** 전문용어 번역 (쉼표로 구분된 복수 항목 지원: 예 "진통제, 항생제") */
export function translateTerm(value: string | undefined, lang: UiLang): string {
  if (!value) return value ?? "";
  if (lang === "ko") return value;
  return value
    .split(/,\s*/)
    .map((tok) => {
      const t = tok.trim();
      const hit = TERMS[t];
      return hit ? hit[lang] : t;
    })
    .join(", ");
}
