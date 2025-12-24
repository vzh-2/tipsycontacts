import { FieldDefinition } from './types';

const generateAgeRanges = () => {
  const ranges = [];
  for (let i = 20; i < 80; i += 5) {
    ranges.push(`${i}-${i + 5}`);
  }
  return ranges;
};

export const CONTACT_FIELDS: FieldDefinition[] = [
  { key: 'meetWhen', label: 'Meet When', placeholder: 'e.g. Happy Hour Oct 2023', type: 'text' },
  { key: 'firstName', label: 'First Name', placeholder: 'John', type: 'text' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe', type: 'text' },
  { key: 'title', label: 'Title', placeholder: 'Senior Engineer', type: 'text' },
  { key: 'company', label: 'Company', placeholder: 'Acme Corp', type: 'text' },
  { 
    key: 'school', 
    label: 'School', 
    placeholder: 'Select or type school', 
    type: 'datalist', 
    options: ['Wharton', 'Lauder', 'HBS', 'CBS', 'Stanford', 'UCLA', 'MIT Sloan', 'Booth', 'Kellogg', 'INSEAD', 'LBS', 'Yale SOM', 'Berkeley Haas'] 
  },
  { key: 'industry', label: 'Industry', placeholder: 'Tech', type: 'text' },
  { key: 'currentResident', label: 'Current Resident', placeholder: 'San Francisco, CA', type: 'text' },
  { key: 'nationality', label: 'Nationality', placeholder: 'USA', type: 'text' },
  { 
    key: 'ageRange', 
    label: 'Age Range', 
    placeholder: 'Select age range', 
    type: 'select',
    options: generateAgeRanges()
  },
  { key: 'birthday', label: 'Birthday', placeholder: 'MM/DD', type: 'text' },
  { key: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '+1 555-0123', type: 'tel' },
  { key: 'link', label: 'Link', placeholder: 'https://linkedin.com/in/...', type: 'url' },
  { key: 'firstImpression', label: 'First Impression', placeholder: 'Friendly, knowledgeable', type: 'text' },
  { 
    key: 'importance', 
    label: 'Importance', 
    placeholder: 'Select importance', 
    type: 'select',
    options: ['Very High', 'High', 'Medium', 'Low']
  },
  { 
    key: 'contactFrequency', 
    label: 'Contact Frequency', 
    placeholder: 'Select frequency', 
    type: 'select',
    options: [
      'Every month',
      'Every 2 months',
      'Every 3 months',
      'Every 4 months',
      'Every 6 months',
      'Every 9 months',
      'Every year'
    ]
  },
  { key: 'lastContact', label: 'Last Contact', placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'lastContactNotes', label: 'Last Contact Notes', placeholder: 'Met at coffee shop...', type: 'text' },
  { key: 'notes', label: 'Notes', placeholder: 'General notes...', type: 'text' },
  { key: 'nextContactDue', label: 'Next Contact Due', placeholder: 'YYYY-MM-DD', type: 'date', readOnly: true },
];

export const INITIAL_CONTACT_DATA: any = {
  meetWhen: '',
  firstName: '',
  lastName: '',
  title: '',
  company: '',
  school: '',
  industry: '',
  currentResident: '',
  nationality: '',
  ageRange: '',
  birthday: '',
  email: '',
  phone: '',
  link: '',
  firstImpression: '',
  importance: '',
  contactFrequency: 'Every 4 months',
  lastContact: '',
  lastContactNotes: '',
  notes: '',
  nextContactDue: '',
};