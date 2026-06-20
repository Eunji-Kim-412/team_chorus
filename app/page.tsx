"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MockPatient } from "@/lib/mockData";
import type { MessageType } from "@/lib/ai/types";
import { usePatients } from "@/context/PatientsContext";
import { translatePetName, translateOwnerName, translateTerm } from "@/lib/i18n";

/* ──────────────────────────────────────────────
   다국어(i18n) — 메인 페이지 데모용
─────────────────────────────────────────────── */
type Lang = "ko" | "en" | "zh" | "fr";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "ko", flag: "🇰🇷", label: "한국어" },
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
];

const LOCALE: Record<Lang, string> = { ko: "ko-KR", en: "en-US", zh: "zh-CN", fr: "fr-FR" };

// 타입별 스타일(아이콘/색)은 언어와 무관하게 고정
const TYPE_STYLE: Record<MessageType, { icon: string; color: string; bg: string }> = {
  vaccination:    { icon: "💉", color: "text-emerald-700", bg: "bg-emerald-50" },
  "pre-surgery":  { icon: "🏥", color: "text-blue-700",    bg: "bg-blue-50" },
  "post-surgery": { icon: "🐾", color: "text-violet-700",  bg: "bg-violet-50" },
  revisit:        { icon: "📅", color: "text-amber-700",   bg: "bg-amber-50" },
};

type Dict = {
  nav: Record<"dashboard" | "messages" | "triage" | "report" | "pets" | "owners" | "templates" | "insight" | "marketing" | "auto", string>;
  care: string; emrTitle: string; pms: string; connected: string; sidebarDesc: string;
  clinicName: string; doctor: string; greetingHello: string;
  readyA: string; unitCount: string; readyB: string; aiBtn: string;
  stat: { pendingLabel: string; pendingSub: string; dueLabel: string; dueSub: string; sentLabel: string; sentSub: string; revenueLabel: string; revenueValue: string; revenueSub: string };
  bannerTitle: (n: number) => string; bannerDesc: string; bannerBtn: string;
  toSendToday: string; viewAll: string; emptyList: string;
  typeMeta: Record<MessageType, { label: string; tagLabel: string }>;
  ddayOverdue: (n: number) => string; ddayDay: string; ddayLeft: (n: number) => string;
  statusSent: string; statusDue: string; statusPending: string;
  preview: string; previewSub: string; aiGen: string; msgContent: string; autoSplit: string;
  safetyCheck: string; passed: string; safetyChecks: string[]; sourceBold: string; sourceRest: string;
  edit: string; schedule: string; selectPatient: string; selectPatientSub1: string; selectPatientSub2: string;
  toast: (name: string) => string;
  tabSend: string; tabMarketing: string;
};

const TR: Record<Lang, Dict> = {
  ko: {
    nav: { dashboard: "오늘의 케어 메시지", messages: "메시지 에이전트", triage: "채팅 에이전트", report: "건강 레포트", pets: "반려동물", owners: "보호자", templates: "템플릿", insight: "케어 인사이트", marketing: "마케팅 인사이트", auto: "자동화 규칙" },
    care: "Care", emrTitle: "EMR 연동", pms: "우리엔 PMS", connected: "연결됨",
    sidebarDesc: "진료 문진 데이터를 분석해 보호자와 소통하고 마케팅 기회를 발굴합니다.",
    clinicName: "우리동물병원", doctor: "Dr. 김지연", greetingHello: "안녕하세요,",
    readyA: "오늘 보호자에게 전달할 케어 메시지 ", unitCount: "건", readyB: "이 준비되어 있어요.",
    aiBtn: "AI 케어 메시지 만들기",
    stat: { pendingLabel: "발송 대기", pendingSub: "+2 전일 대비", dueLabel: "오늘 마감", dueSub: "긴급", sentLabel: "발송 완료", sentSub: "+1 전일 대비", revenueLabel: "재방문 기여 매출", revenueValue: "₩168만", revenueSub: "이번 달 · 전월 18건" },
    bannerTitle: (n) => `이탈 위험 환자 ${n}마리`, bannerDesc: "마지막 내원 후 정기 검진 시기를 놓친 단골 환자에요. 케어 메시지로 다시 연결해 보세요.", bannerBtn: "일괄 메시지 보내기",
    toSendToday: "오늘 보낼 것", viewAll: "전체 보기 →", emptyList: "발송 대기 중인 환자가 없습니다.",
    typeMeta: { vaccination: { label: "예방접종", tagLabel: "접종 리마인드" }, "pre-surgery": { label: "수술 전", tagLabel: "수술 전 케어" }, "post-surgery": { label: "수술 후", tagLabel: "수술 후 케어" }, revisit: { label: "재내원", tagLabel: "재내원 안내" } },
    ddayOverdue: (n) => `D+${n} 지남`, ddayDay: "D-day", ddayLeft: (n) => `D-${n}`,
    statusSent: "발송 완료", statusDue: "오늘 마감", statusPending: "검수 대기",
    preview: "메시지 미리보기", previewSub: "환자를 선택하면 예상 메시지를 확인할 수 있어요", aiGen: "✨ AI 생성", msgContent: "메시지 내용", autoSplit: "긴 안내문도 자동 분할 발송",
    safetyCheck: "Safety Check", passed: "검수 통과",
    safetyChecks: ["반려동물명·견종 포함", "수술명 보호자 언어로 변환", "주의사항·응급징후 포함", "과도한 의학 표현 없음", "진료기록 기반 생성", "과장·단정 표현 없음"],
    sourceBold: "원진 진료 차트 · 우리엔 PMS", sourceRest: " 데이터를 기반으로 AI가 보호자 맞춤 메시지를 자동 생성했어요.",
    edit: "수정하기", schedule: "발송 예약", selectPatient: "환자를 선택해 주세요", selectPatientSub1: "왼쪽 목록에서 환자를 클릭하면", selectPatientSub2: "메시지 미리보기가 표시돼요",
    toast: (name) => `${name} 보호자님께 메시지가 예약되었습니다`,
    tabSend: "발송", tabMarketing: "마케팅",
  },
  en: {
    nav: { dashboard: "Today's Care", messages: "Message Agent", triage: "Chat Agent", report: "Health Report", pets: "Pets", owners: "Guardians", templates: "Templates", insight: "Care Insights", marketing: "Marketing Insights", auto: "Automation" },
    care: "Care", emrTitle: "EMR Integration", pms: "Woori PMS", connected: "Connected",
    sidebarDesc: "Analyzes intake data to engage guardians and uncover marketing opportunities.",
    clinicName: "Woori Animal Hospital", doctor: "Dr. Kim Jiyeon", greetingHello: "Good morning,",
    readyA: "You have ", unitCount: " care messages", readyB: " ready for guardians today.",
    aiBtn: "Create AI care message",
    stat: { pendingLabel: "To send", pendingSub: "+2 vs yesterday", dueLabel: "Due today", dueSub: "Urgent", sentLabel: "Sent", sentSub: "+1 vs yesterday", revenueLabel: "Revisit revenue", revenueValue: "₩1.68M", revenueSub: "This month · 18 last month" },
    bannerTitle: (n) => `${n} at-risk patients`, bannerDesc: "Regular patients who missed their checkup window since their last visit. Reconnect with a care message.", bannerBtn: "Send bulk message",
    toSendToday: "To send today", viewAll: "View all →", emptyList: "No patients waiting to be sent.",
    typeMeta: { vaccination: { label: "Vaccination", tagLabel: "Vaccine reminder" }, "pre-surgery": { label: "Pre-op", tagLabel: "Pre-op care" }, "post-surgery": { label: "Post-op", tagLabel: "Post-op care" }, revisit: { label: "Revisit", tagLabel: "Revisit notice" } },
    ddayOverdue: (n) => `D+${n} overdue`, ddayDay: "D-day", ddayLeft: (n) => `D-${n}`,
    statusSent: "Sent", statusDue: "Due today", statusPending: "Pending review",
    preview: "Message preview", previewSub: "Select a patient to preview the message", aiGen: "✨ AI generated", msgContent: "Message", autoSplit: "Long messages are auto-split",
    safetyCheck: "Safety Check", passed: "Passed",
    safetyChecks: ["Pet name & breed included", "Surgery name in plain language", "Precautions & emergency signs", "No excessive medical jargon", "Based on medical records", "No exaggeration"],
    sourceBold: "Chart data · Woori PMS", sourceRest: " — the AI auto-generated a guardian-tailored message from this data.",
    edit: "Edit", schedule: "Schedule send", selectPatient: "Select a patient", selectPatientSub1: "Click a patient on the left", selectPatientSub2: "to preview the message",
    toast: (name) => `Message scheduled for ${name}`,
    tabSend: "Send", tabMarketing: "Marketing",
  },
  zh: {
    nav: { dashboard: "今日护理消息", messages: "消息代理", triage: "聊天代理", report: "健康报告", pets: "宠物", owners: "监护人", templates: "模板", insight: "护理洞察", marketing: "营销洞察", auto: "自动化规则" },
    care: "Care", emrTitle: "EMR 集成", pms: "Woori PMS", connected: "已连接",
    sidebarDesc: "分析问诊数据，与监护人沟通并发掘营销机会。",
    clinicName: "Woori动物医院", doctor: "Dr. Kim Jiyeon", greetingHello: "早上好，",
    readyA: "今天有 ", unitCount: " 条护理消息", readyB: " 准备发送给监护人。",
    aiBtn: "创建 AI 护理消息",
    stat: { pendingLabel: "待发送", pendingSub: "+2 较昨日", dueLabel: "今日截止", dueSub: "紧急", sentLabel: "已发送", sentSub: "+1 较昨日", revenueLabel: "复诊贡献收入", revenueValue: "₩168万", revenueSub: "本月 · 上月18件" },
    bannerTitle: (n) => `${n} 位流失风险患者`, bannerDesc: "自上次就诊后错过定期检查的常客患者。用护理消息重新联系吧。", bannerBtn: "批量发送消息",
    toSendToday: "今日待发", viewAll: "查看全部 →", emptyList: "没有待发送的患者。",
    typeMeta: { vaccination: { label: "疫苗接种", tagLabel: "接种提醒" }, "pre-surgery": { label: "术前", tagLabel: "术前护理" }, "post-surgery": { label: "术后", tagLabel: "术后护理" }, revisit: { label: "复诊", tagLabel: "复诊通知" } },
    ddayOverdue: (n) => `已过 D+${n}`, ddayDay: "当天", ddayLeft: (n) => `D-${n}`,
    statusSent: "已发送", statusDue: "今日截止", statusPending: "待审核",
    preview: "消息预览", previewSub: "选择患者即可预览消息", aiGen: "✨ AI 生成", msgContent: "消息内容", autoSplit: "长消息自动分段发送",
    safetyCheck: "Safety Check", passed: "审核通过",
    safetyChecks: ["包含宠物名·品种", "手术名转为通俗语言", "包含注意事项·急症征兆", "无过度医学术语", "基于诊疗记录生成", "无夸大·武断表述"],
    sourceBold: "诊疗图表 · Woori PMS", sourceRest: " —— AI 基于这些数据自动生成了定制消息。",
    edit: "编辑", schedule: "预约发送", selectPatient: "请选择患者", selectPatientSub1: "点击左侧列表中的患者", selectPatientSub2: "即可预览消息",
    toast: (name) => `已为 ${name} 预约消息`,
    tabSend: "发送", tabMarketing: "营销",
  },
  fr: {
    nav: { dashboard: "Soins du jour", messages: "Agent Messages", triage: "Agent Chat", report: "Rapport Santé", pets: "Animaux", owners: "Tuteurs", templates: "Modèles", insight: "Analyses Soins", marketing: "Analyses Marketing", auto: "Automatisation" },
    care: "Care", emrTitle: "Intégration EMR", pms: "Woori PMS", connected: "Connecté",
    sidebarDesc: "Analyse les données pour engager les tuteurs et trouver des opportunités marketing.",
    clinicName: "Clinique Vétérinaire Woori", doctor: "Dr. Kim Jiyeon", greetingHello: "Bonjour,",
    readyA: "Vous avez ", unitCount: " messages de soins", readyB: " prêts à envoyer aux tuteurs aujourd'hui.",
    aiBtn: "Créer un message IA",
    stat: { pendingLabel: "À envoyer", pendingSub: "+2 vs hier", dueLabel: "Échéance auj.", dueSub: "Urgent", sentLabel: "Envoyé", sentSub: "+1 vs hier", revenueLabel: "Revenus de retour", revenueValue: "₩1,68M", revenueSub: "Ce mois · 18 le mois dernier" },
    bannerTitle: (n) => `${n} patients à risque`, bannerDesc: "Patients réguliers ayant manqué leur visite de contrôle. Reconnectez-vous via un message de soins.", bannerBtn: "Envoyer en masse",
    toSendToday: "À envoyer aujourd'hui", viewAll: "Tout voir →", emptyList: "Aucun patient en attente d'envoi.",
    typeMeta: { vaccination: { label: "Vaccination", tagLabel: "Rappel vaccin" }, "pre-surgery": { label: "Pré-op", tagLabel: "Soins pré-op" }, "post-surgery": { label: "Post-op", tagLabel: "Soins post-op" }, revisit: { label: "Retour", tagLabel: "Avis de retour" } },
    ddayOverdue: (n) => `J+${n} en retard`, ddayDay: "Jour J", ddayLeft: (n) => `J-${n}`,
    statusSent: "Envoyé", statusDue: "Échéance auj.", statusPending: "En attente",
    preview: "Aperçu du message", previewSub: "Sélectionnez un patient pour prévisualiser", aiGen: "✨ Généré par IA", msgContent: "Contenu", autoSplit: "Les longs messages sont divisés automatiquement",
    safetyCheck: "Safety Check", passed: "Validé",
    safetyChecks: ["Nom et race inclus", "Nom de chirurgie vulgarisé", "Précautions et signes d'urgence", "Sans jargon médical excessif", "Basé sur le dossier médical", "Sans exagération"],
    sourceBold: "Dossier · Woori PMS", sourceRest: " — l'IA a généré automatiquement un message personnalisé à partir de ces données.",
    edit: "Modifier", schedule: "Programmer l'envoi", selectPatient: "Sélectionnez un patient", selectPatientSub1: "Cliquez sur un patient à gauche", selectPatientSub2: "pour prévisualiser le message",
    toast: (name) => `Message programmé pour ${name}`,
    tabSend: "Envoi", tabMarketing: "Marketing",
  },
};

function ageUnit(lang: Lang) {
  return lang === "ko" ? "세" : lang === "zh" ? "岁" : lang === "en" ? " yrs" : " ans";
}
function petInfo(p: MockPatient, lang: Lang) {
  const sep = lang === "ko" || lang === "zh" ? "·" : " · ";
  return `${translateTerm(p.breed, lang)}${sep}${p.age}${ageUnit(lang)}`;
}
function ownerLabel(name: string, lang: Lang) {
  if (lang === "ko") return `${name} 보호자`;
  const w = { en: "Guardian", zh: "监护人", fr: "Tuteur" }[lang];
  return `${w} ${name}`;
}

const SAFETY_CHECKS = (lang: Lang) => TR[lang].safetyChecks;

function dDayBadge(d: number, lang: Lang) {
  const T = TR[lang];
  if (d < 0) return { label: T.ddayOverdue(Math.abs(d)), cls: "bg-red-100 text-red-700" };
  if (d === 0) return { label: T.ddayDay, cls: "bg-orange-100 text-orange-700 font-bold" };
  return { label: T.ddayLeft(d), cls: "bg-gray-100 text-gray-600" };
}

function statusBadge(p: MockPatient, lang: Lang) {
  const T = TR[lang];
  if (p.status === "sent") return { label: T.statusSent, cls: "bg-emerald-50 text-emerald-700" };
  if (p.dDay <= 0) return { label: T.statusDue, cls: "bg-orange-100 text-orange-700 font-bold" };
  return { label: T.statusPending, cls: "bg-gray-100 text-gray-500" };
}

function formatDate(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDate(p: MockPatient) {
  return p.vaccineDate ?? p.nextVisit ?? p.revisitDate;
}

// 언어별 케어 메시지 템플릿
const MSG: Record<Lang, Record<MessageType, (p: MockPatient) => string>> = {
  ko: {
    "post-surgery": (p) => `안녕하세요, 우리동물병원입니다. 🐾\n${p.petName}(${petInfo(p, "ko")})의 수술이 잘 끝났어요.\n\n오늘 받은 수술은 '${p.surgeryType}'입니다. 어긋나 있던 부위를 제자리로 교정하는 수술이에요.\n\n[집에서 꼭 지켜주세요]\n· 봉합 부위는 14일간 닿지 않게 해주세요\n· 점프·계단 오르내리기는 2주간 제한해주세요\n· 처방된 ${p.medications}은 하루 2회, 식사 후 급여해주세요\n\n[이럴 땐 바로 연락 주세요]\n· 봉합 부위가 붉게 붓거나 진물이 날 때\n· 식욕이 24시간 이상 없을 때\n\n다음 내원: ${formatDate(p.nextVisit)} (실밥 제거)\n궁금한 점 있으시면 언제든 연락 주세요.\n우리동물병원 드림`,
    vaccination: (p) => `안녕하세요, 우리동물병원입니다. 💉\n${p.petName}(${petInfo(p, "ko")}) 예방접종 안내드려요.\n\n· 접종 종류: ${p.vaccineType}\n· 예정일: ${formatDate(p.vaccineDate)}\n\n당일 ${p.petName}의 컨디션이 좋지 않으면 미리 연락 주세요.\n접종 전 12시간 공복은 불필요하지만, 과격한 운동은 피해주세요.\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`,
    "pre-surgery": (p) => `안녕하세요, 우리동물병원입니다. 🏥\n${p.petName}(${petInfo(p, "ko")}) 수술 전 안내드려요.\n\n· 수술: ${p.surgeryType}\n· 수술 예정일: ${formatDate(p.nextVisit)}\n\n[수술 전 주의사항]\n· 수술 12시간 전부터 금식해주세요\n· 물은 6시간 전까지 가능해요\n· 당일 목욕은 피해주세요\n· 목걸이·하네스는 풀어서 내원해주세요\n\n궁금하신 점은 병원으로 연락 주세요.\n우리동물병원 드림`,
    revisit: (p) => `안녕하세요, 우리동물병원입니다. 📅\n${p.petName}(${petInfo(p, "ko")}) 재내원 안내드려요.\n\n· 방문 사유: ${p.revisitReason}\n· 방문 예정일: ${formatDate(p.revisitDate)}\n\n예약 날짜에 맞춰 방문 부탁드려요.\n변경이 필요하시면 미리 연락 주세요.\n\n우리동물병원 드림`,
  },
  en: {
    "post-surgery": (p) => `Hello, this is Woori Animal Hospital. 🐾\n${p.petName} (${petInfo(p, "en")}) came through surgery well.\n\nToday's procedure was '${p.surgeryType}', which realigns the affected area.\n\n[Please follow at home]\n· Keep the incision untouched for 14 days\n· Limit jumping and stairs for 2 weeks\n· Give the prescribed ${p.medications} twice daily, after meals\n\n[Contact us right away if]\n· The incision becomes red, swollen, or oozes\n· There is no appetite for over 24 hours\n\nNext visit: ${formatDate(p.nextVisit)} (suture removal)\nFeel free to reach out anytime.\n— Woori Animal Hospital`,
    vaccination: (p) => `Hello, this is Woori Animal Hospital. 💉\nA vaccination reminder for ${p.petName} (${petInfo(p, "en")}).\n\n· Vaccine: ${p.vaccineType}\n· Scheduled: ${formatDate(p.vaccineDate)}\n\nIf ${p.petName} isn't feeling well that day, please let us know in advance.\nFasting isn't required, but avoid intense exercise beforehand.\n\nContact us with any questions.\n— Woori Animal Hospital`,
    "pre-surgery": (p) => `Hello, this is Woori Animal Hospital. 🏥\nPre-op guidance for ${p.petName} (${petInfo(p, "en")}).\n\n· Surgery: ${p.surgeryType}\n· Scheduled: ${formatDate(p.nextVisit)}\n\n[Before surgery]\n· No food from 12 hours before surgery\n· Water is OK up to 6 hours before\n· Avoid bathing on the day\n· Remove collar and harness before arrival\n\nContact us with any questions.\n— Woori Animal Hospital`,
    revisit: (p) => `Hello, this is Woori Animal Hospital. 📅\nA revisit reminder for ${p.petName} (${petInfo(p, "en")}).\n\n· Reason: ${p.revisitReason}\n· Scheduled: ${formatDate(p.revisitDate)}\n\nPlease visit on the booked date.\nLet us know in advance if you need to reschedule.\n\n— Woori Animal Hospital`,
  },
  zh: {
    "post-surgery": (p) => `您好，这里是Woori动物医院。🐾\n${p.petName}（${petInfo(p, "zh")}）的手术已顺利完成。\n\n今天进行的手术是"${p.surgeryType}"，用于将错位部位复位矫正。\n\n【请在家务必遵守】\n· 缝合处14天内请勿触碰\n· 跳跃和上下楼梯请限制2周\n· 处方药${p.medications}每日2次，餐后服用\n\n【出现以下情况请立即联系】\n· 缝合处发红、肿胀或渗液时\n· 食欲超过24小时仍未恢复时\n\n下次就诊：${formatDate(p.nextVisit)}（拆线）\n如有疑问，随时与我们联系。\nWoori动物医院 敬上`,
    vaccination: (p) => `您好，这里是Woori动物医院。💉\n为${p.petName}（${petInfo(p, "zh")}）提供疫苗接种提醒。\n\n· 接种种类：${p.vaccineType}\n· 预定日期：${formatDate(p.vaccineDate)}\n\n当天若${p.petName}状态不佳，请提前联系我们。\n接种前无需空腹12小时，但请避免剧烈运动。\n\n如有疑问，请联系医院。\nWoori动物医院 敬上`,
    "pre-surgery": (p) => `您好，这里是Woori动物医院。🏥\n为${p.petName}（${petInfo(p, "zh")}）提供术前须知。\n\n· 手术：${p.surgeryType}\n· 手术预定日：${formatDate(p.nextVisit)}\n\n【术前注意事项】\n· 手术前12小时开始禁食\n· 饮水可至术前6小时\n· 当天请勿洗澡\n· 请取下项圈·胸背带后就诊\n\n如有疑问，请联系医院。\nWoori动物医院 敬上`,
    revisit: (p) => `您好，这里是Woori动物医院。📅\n为${p.petName}（${petInfo(p, "zh")}）提供复诊提醒。\n\n· 就诊原因：${p.revisitReason}\n· 预定日期：${formatDate(p.revisitDate)}\n\n请按预约日期前来就诊。\n如需更改，请提前联系我们。\n\nWoori动物医院 敬上`,
  },
  fr: {
    "post-surgery": (p) => `Bonjour, ici la Clinique Vétérinaire Woori. 🐾\n${p.petName} (${petInfo(p, "fr")}) s'est bien remis(e) de l'opération.\n\nL'intervention du jour était « ${p.surgeryType} », qui réaligne la zone concernée.\n\n[À respecter à la maison]\n· Ne pas toucher la suture pendant 14 jours\n· Limiter les sauts et escaliers pendant 2 semaines\n· Donner ${p.medications} 2 fois par jour, après les repas\n\n[Contactez-nous immédiatement si]\n· La suture rougit, gonfle ou suinte\n· Absence d'appétit pendant plus de 24 h\n\nProchaine visite : ${formatDate(p.nextVisit)} (retrait des fils)\nN'hésitez pas à nous contacter.\n— Clinique Vétérinaire Woori`,
    vaccination: (p) => `Bonjour, ici la Clinique Vétérinaire Woori. 💉\nRappel de vaccination pour ${p.petName} (${petInfo(p, "fr")}).\n\n· Vaccin : ${p.vaccineType}\n· Date prévue : ${formatDate(p.vaccineDate)}\n\nSi ${p.petName} ne se sent pas bien ce jour-là, prévenez-nous à l'avance.\nLe jeûne n'est pas nécessaire, mais évitez tout exercice intense.\n\nContactez-nous pour toute question.\n— Clinique Vétérinaire Woori`,
    "pre-surgery": (p) => `Bonjour, ici la Clinique Vétérinaire Woori. 🏥\nConsignes pré-opératoires pour ${p.petName} (${petInfo(p, "fr")}).\n\n· Chirurgie : ${p.surgeryType}\n· Date prévue : ${formatDate(p.nextVisit)}\n\n[Avant l'opération]\n· À jeun 12 h avant la chirurgie\n· Eau autorisée jusqu'à 6 h avant\n· Pas de bain le jour même\n· Retirer collier et harnais avant l'arrivée\n\nContactez-nous pour toute question.\n— Clinique Vétérinaire Woori`,
    revisit: (p) => `Bonjour, ici la Clinique Vétérinaire Woori. 📅\nRappel de visite pour ${p.petName} (${petInfo(p, "fr")}).\n\n· Motif : ${p.revisitReason}\n· Date prévue : ${formatDate(p.revisitDate)}\n\nMerci de venir à la date prévue.\nPrévenez-nous à l'avance en cas de changement.\n\n— Clinique Vétérinaire Woori`,
  },
};

function getSampleMessage(p: MockPatient, lang: Lang): string {
  // 이름·전문용어(약품/수술/백신/사유)를 선택 언어로 변환한 사본으로 메시지 생성
  const lp: MockPatient = {
    ...p,
    petName: translatePetName(p.petName, lang),
    surgeryType: translateTerm(p.surgeryType, lang),
    medications: translateTerm(p.medications, lang),
    vaccineType: translateTerm(p.vaccineType, lang),
    revisitReason: translateTerm(p.revisitReason, lang),
  };
  return MSG[lang]?.[p.messageType]?.(lp) ?? "";
}

function getByteLength(str: string) {
  return new TextEncoder().encode(str).length;
}

function Sidebar({ active, lang }: { active: "dashboard" | "marketing"; lang: Lang }) {
  const T = TR[lang];
  const navItems: { key: string; href: string; label: string; d: string; isNew?: boolean }[] = [
    { key: "dashboard", href: "/", label: T.nav.dashboard, d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "messages",  href: "/messages",   label: T.nav.messages,  d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
    { key: "triage",    href: "/triage",     label: T.nav.triage,    d: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", isNew: true },
    { key: "report",    href: "/report",     label: T.nav.report,    d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", isNew: true },
    { key: "pets",      href: "/pets",       label: T.nav.pets,      d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { key: "owners",    href: "/owners",     label: T.nav.owners,    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "templates", href: "/templates",  label: T.nav.templates, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { key: "insight",   href: "/insight",    label: T.nav.insight,   d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { key: "marketing", href: "/marketing",  label: T.nav.marketing, d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", isNew: true },
    { key: "auto",      href: "/automation", label: T.nav.auto,      d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 bottom-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-50">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-base">🐾</div>
        <div className="flex items-baseline gap-1">
          <span className="font-black text-gray-900 text-sm tracking-tight">Pawly</span>
          <span className="text-gray-400 text-xs">{T.care}</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <Link key={item.key} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors ${
                isActive ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.d} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.isNew && <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-semibold">{T.emrTitle}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{T.pms}</span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>{T.connected}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{T.sidebarDesc}</p>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { patients, updatePatient } = usePatients();
  const [selectedId, setSelectedId] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("ko");
  const T = TR[lang];

  const toggleStatus = (id: string) => {
    const p = patients.find((x) => x.id === id);
    if (p) updatePatient(id, { status: p.status === "pending" ? "sent" : "pending" });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? patients[0] ?? null;
  const msg = selectedPatient ? getSampleMessage(selectedPatient, lang) : "";
  const byteLen = getByteLength(msg);

  // 오늘 보낼 것: 발송 대기 중 우선순위(긴급/연체)순 상위 6건만 미리보기
  const todayList = [...patients]
    .filter((p) => p.status === "pending")
    .sort((a, b) => a.dDay - b.dDay)
    .slice(0, 6);

  const pending = patients.filter((p) => p.status === "pending").length;
  const todayDeadline = patients.filter((p) => p.dDay <= 0 && p.status === "pending").length;
  const sent = patients.filter((p) => p.status === "sent").length;
  const atRiskCount = patients.filter((p) => p.atRisk).length;

  const handleCompose = (p: MockPatient) => {
    const prefill = {
      patientId: p.id, ownerName: p.ownerName,
      messageType: p.messageType, patientName: p.petName, breed: p.breed, age: p.age,
      vaccineType: p.vaccineType, vaccineDate: p.vaccineDate, reminderDays: p.reminderDays,
      surgeryType: p.surgeryType, medications: p.medications, nextVisit: p.nextVisit,
      revisitDate: p.revisitDate, revisitReason: p.revisitReason,
    };
    sessionStorage.setItem("vetscribe_prefill", JSON.stringify(prefill));
    router.push(`/compose?type=${p.messageType}&prefill=1`);
  };

  const statCards = [
    { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", iconColor: "text-orange-400", label: T.stat.pendingLabel, value: `${pending}${T.unitCount}`, sub: T.stat.pendingSub, subColor: "text-orange-500" },
    { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", iconColor: "text-red-400", label: T.stat.dueLabel, value: `${todayDeadline}${T.unitCount}`, sub: T.stat.dueSub, subColor: "text-red-500 font-semibold" },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", iconColor: "text-emerald-400", label: T.stat.sentLabel, value: `${sent}${T.unitCount}`, sub: T.stat.sentSub, subColor: "text-emerald-600" },
    { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", iconColor: "text-blue-400", label: T.stat.revenueLabel, value: T.stat.revenueValue, sub: T.stat.revenueSub, subColor: "text-gray-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
      <Sidebar active="dashboard" lang={lang} />

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-20 flex-shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm">🐾</div>
              <span className="font-black text-gray-900 text-sm">Pawly</span>
            </div>

            {/* 언어 전환 (국기 아이콘) */}
            <div className="flex items-center gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  title={l.label}
                  aria-label={l.label}
                  aria-pressed={lang === l.code}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    lang === l.code ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-gray-50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className={`hidden md:block text-xs font-semibold ${lang === l.code ? "text-emerald-700" : "text-gray-500"}`}>{l.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="relative">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white text-[7px] text-white flex items-center justify-center font-bold">3</span>
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-700 font-semibold hidden sm:block">{T.clinicName}</span>
                <svg className="w-3 h-3 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">🐾</div>
                <span className="text-gray-600 text-xs hidden sm:block">{T.doctor}</span>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <div className="flex flex-1 min-h-0">
          {/* 메인 */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-6 py-6 space-y-5 max-w-3xl">

              {/* 인사 + CTA */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{T.greetingHello} {T.clinicName} 🐾</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {T.readyA}<span className="font-bold text-gray-800">{pending}{T.unitCount}</span>{T.readyB}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/compose?type=post-surgery")}
                  className="flex-shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  {T.aiBtn}
                </button>
              </div>

              {/* 통계 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statCards.map((c) => (
                  <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className={`w-4 h-4 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
                      </svg>
                      <span className="text-xs text-gray-500">{c.label}</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{c.value}</div>
                    <div className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* 이탈 위험 배너 */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-amber-800">{T.bannerTitle(atRiskCount + 10)}</p>
                    <p className="text-xs text-amber-600 mt-0.5">{T.bannerDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/messages")}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
                >
                  {T.bannerBtn}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 오늘 보낼 것 (미리보기) */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">
                  {T.toSendToday} <span className="text-gray-400 font-medium">{todayList.length}</span>
                </h2>
                <button onClick={() => router.push("/messages")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  {T.viewAll}
                </button>
              </div>

              {/* 환자 목록 */}
              <div className="space-y-2">
                {todayList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
                    {T.emptyList}
                  </div>
                )}
                {todayList.map((p) => {
                  const meta = { ...TYPE_STYLE[p.messageType], ...T.typeMeta[p.messageType] };
                  const dday = dDayBadge(p.dDay, lang);
                  const status = statusBadge(p, lang);
                  const isSelected = p.id === selectedId;
                  const date = getDate(p);
                  const dateStr = date ? new Date(date).toLocaleDateString(LOCALE[lang], { month: "numeric", day: "numeric", weekday: "short" }) : "";

                  return (
                    <div key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 cursor-pointer transition-all ${
                        isSelected ? "border-emerald-300 shadow-md ring-1 ring-emerald-200" : "border-gray-100 hover:border-emerald-200 hover:shadow-md"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-shrink-0 min-w-[76px]">
                        <p className="font-bold text-gray-900 text-sm">{translatePetName(p.petName, lang)}</p>
                        <p className="text-xs text-gray-400">{petInfo(p, lang)}</p>
                      </div>
                      <div className="flex-shrink-0 min-w-[120px]">
                        <p className="text-sm text-gray-700 font-medium">{ownerLabel(translateOwnerName(p.ownerName, lang), lang)}</p>
                        <p className="text-xs text-gray-400">{p.ownerPhone}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${meta.bg} ${meta.color}`}>
                          {meta.tagLabel}
                        </span>
                        {dateStr && <p className="text-xs text-gray-500">{dateStr}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${dday.cls}`}>{dday.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(p.id); }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 transition-colors ${status.cls}`}
                      >
                        {status.label}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleCompose(p); }}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* 우측 미리보기 패널 */}
          <aside className="hidden xl:flex flex-col w-[420px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
            {selectedPatient ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{T.preview}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{T.previewSub}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">{T.aiGen}</span>
                </div>
                <div className="flex-1 px-6 py-5 space-y-5">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${TYPE_STYLE[selectedPatient.messageType].bg}`}>
                      {TYPE_STYLE[selectedPatient.messageType].icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">To. {ownerLabel(translateOwnerName(selectedPatient.ownerName, lang), lang)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{translatePetName(selectedPatient.petName, lang)} · {petInfo(selectedPatient, lang)}</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${TYPE_STYLE[selectedPatient.messageType].bg} ${TYPE_STYLE[selectedPatient.messageType].color}`}>
                        {T.typeMeta[selectedPatient.messageType].label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">{T.msgContent}</span>
                      <span className="text-[10px] text-gray-400">{byteLen} / 1,000 byte</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100 min-h-[200px]">
                      {msg}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">{T.autoSplit}</p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-800">{T.safetyCheck}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{T.passed}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SAFETY_CHECKS(lang).map((item) => (
                        <div key={item} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
                    <span className="font-semibold">{T.sourceBold}</span>{T.sourceRest}
                  </div>
                </div>
                <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={() => handleCompose(selectedPatient)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {T.edit}
                  </button>
                  <button onClick={() => showToast(T.toast(translateOwnerName(selectedPatient.ownerName, lang)))}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                  >
                    {T.schedule}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🐾</div>
                <div>
                  <p className="text-sm font-bold text-gray-700">{T.selectPatient}</p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{T.selectPatientSub1}<br />{T.selectPatientSub2}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20">
        <Link href="/" className="flex-1 flex flex-col items-center py-3 gap-1 text-emerald-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-semibold">{T.tabSend}</span>
        </Link>
        <Link href="/marketing" className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-semibold">{T.tabMarketing}</span>
        </Link>
      </nav>
    </div>
  );
}
