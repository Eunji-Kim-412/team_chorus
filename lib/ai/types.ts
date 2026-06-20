export interface AIProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export type MessageType =
  | "vaccination"
  | "pre-surgery"
  | "post-surgery"
  | "revisit";

export type Language = "ko" | "en" | "zh" | "fr";
export type Tone = "friendly" | "simple" | "custom";

export interface PatientInfo {
  patientName: string;
  breed: string;
  age: string;
  messageType: MessageType;
  language?: Language;
  tone?: Tone;
  customTone?: string;
  // vaccination
  vaccineType?: string;
  vaccineDate?: string;
  reminderDays?: string;
  reminderDaysList?: string[];
  // surgery
  surgeryType?: string;
  medications?: string;
  nextVisit?: string;
  // revisit
  revisitDate?: string;
  revisitReason?: string;
}
