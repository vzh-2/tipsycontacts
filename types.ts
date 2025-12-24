export interface ContactData {
  meetWhen: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  school: string;
  industry: string;
  currentResident: string;
  nationality: string;
  ageRange: string;
  birthday: string;
  email: string;
  phone: string;
  link: string; // LinkedIn URL or website
  firstImpression: string;
  importance: string;
  contactFrequency: string;
  lastContact: string;
  lastContactNotes: string;
  notes: string;
  nextContactDue: string;
}

export type ProcessingStatus = 'idle' | 'analyzing' | 'review' | 'saving' | 'success';

export interface FieldDefinition {
  key: keyof ContactData;
  label: string;
  placeholder: string;
  type: 'text' | 'date' | 'email' | 'url' | 'tel' | 'select' | 'datalist';
  options?: string[];
  readOnly?: boolean;
}