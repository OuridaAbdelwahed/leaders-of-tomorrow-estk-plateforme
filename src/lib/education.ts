export type EducationProgram = {
  value: string;
  code?: string;
  label: string;
  group: string;
  detail?: string;
};

export type EducationInstitution = {
  name: string;
  group: 'Public high schools' | 'Private high schools' | 'Higher education & training';
  status: 'Public' | 'Private' | 'Training institute';
};

const publicHighSchools = [
  'Lycée Mohammed V',
  'Lycée Mohammed VI',
  'Lycée Fatima Zahra',
  'Lycée Zerktouni',
  'Lycée Tarik Ibn Ziyad',
] as const;

const privateHighSchools = [
  'Groupe Scolaire Abghor',
  'Alanwar',
  'Jil Attawfiq',
  'Nawras El Maarifa',
  'Oum Al Banine',
  'La Référence',
  'Groupe Scolaire Tusna',
  'Zayane',
  'Al Hikma',
  'Nour Arrissala',
] as const;

export const trainingInstitutions = {
  ista2: 'Institut Spécialisé de Technologie Appliquée Khénifra',
  higherApplied: 'Higher Institute of Applied Technology',
  est: 'École Supérieure de Technologie',
} as const;

export const educationInstitutions: EducationInstitution[] = [
  ...publicHighSchools.map(name => ({ name, group: 'Public high schools' as const, status: 'Public' as const })),
  ...privateHighSchools.map(name => ({ name, group: 'Private high schools' as const, status: 'Private' as const })),
  ...Object.values(trainingInstitutions).map(name => ({ name, group: 'Higher education & training' as const, status: 'Training institute' as const })),
];

const highSchoolStreams = [
  ['SMA', 'Sciences Mathématiques A'],
  ['SMB', 'Sciences Mathématiques B'],
  ['SPC', 'Sciences Physiques et Chimie'],
  ['SVT', 'Sciences de la Vie et de la Terre'],
  ['AGRO', 'Sciences Agronomiques'],
  ['STE', 'Sciences et Technologies Électriques'],
  ['STM', 'Sciences et Technologies Mécaniques'],
  ['SEG', 'Sciences Économiques'],
  ['SGC', 'Sciences de Gestion Comptable'],
  ['LSH', 'Lettres et Sciences Humaines'],
  ['SHARIA', 'Sciences Charia'],
  ['LANG', 'Langue Arabe'],
  ['AA', 'Arts Appliqués'],
] as const;

const publicSchoolStreams: Record<(typeof publicHighSchools)[number], readonly string[]> = {
  'Lycée Mohammed V': ['SMA', 'SMB', 'SPC', 'SVT'],
  'Lycée Mohammed VI': ['SMA', 'SMB', 'SPC', 'SVT'],
  'Lycée Fatima Zahra': ['SPC', 'SVT', 'LSH'],
  'Lycée Zerktouni': ['SPC', 'SVT', 'SEG', 'SGC'],
  'Lycée Tarik Ibn Ziyad': ['SPC', 'SVT', 'LSH'],
};

const makeProgram = (code: string | undefined, label: string, group: string, detail?: string): EducationProgram => ({
  code,
  label,
  group,
  detail,
  value: `${group} · ${code ? `[${code}] ` : ''}${label}${detail ? ` · ${detail}` : ''}`,
});

const highSchoolPrograms = (codes?: readonly string[]) => highSchoolStreams
  .filter(([code]) => !codes || codes.includes(code))
  .map(([code, label]) => makeProgram(code, label, 'Baccalaureate stream'));

const estPrograms: EducationProgram[] = [
  makeProgram('IDIA', 'Ingénierie des Données et Intelligence Artificielle', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('ILR', 'Ingénierie Logicielle et Réseaux', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('GME', "Génie des Mines et de l'Environnement", 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('GE', "Génie de l'Environnement", 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('GTER', 'Génie Thermique et Énergies Renouvelables', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('BTV', 'Biotechnologie Végétale', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('LBAC', 'Bioanalyses et Contrôle', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('MRH', 'Management des Ressources Humaines', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('TCC', 'Techniques de Commercialisation et de Communication', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('TAA', 'Technologie Agroalimentaire', 'DUT / Bachelor Universitaire de Technologie (BUT)'),
  makeProgram('ABE', 'Agriculture Biologique', 'Licences / Bachelor Professionnels'),
  makeProgram('AGDEA', 'Gestion et Développement', 'Licences / Bachelor Professionnels'),
  makeProgram('EDT', 'Entrepreneuriat Territorial', 'Licences / Bachelor Professionnels'),
  makeProgram('GEDD', 'Gestion Durable et Développement', 'Licences / Bachelor Professionnels'),
  makeProgram('MLBCQ', 'Laboratoires, Biologie, Contrôle et Qualité', 'Licences / Bachelor Professionnels'),
];

const ista2Programs = [
  makeProgram('ESA', 'Électromécanique des Systèmes Automatisés', 'Technicien Spécialisé', 'Génie Électrique'),
];

const higherAppliedPrograms: EducationProgram[] = [
  makeProgram(undefined, 'Développement Digital', 'Technicien Spécialisé', 'Web Full Stack'),
  makeProgram(undefined, 'Infrastructure Digitale', 'Technicien Spécialisé'),
  makeProgram(undefined, 'Gestion des Entreprises', 'Technicien Spécialisé', 'Comptabilité et Finance'),
  makeProgram(undefined, 'Gestion Informatisée', 'Technicien'),
  makeProgram(undefined, 'Commerce', 'Technicien'),
  makeProgram(undefined, 'Secrétariat de Direction', 'Technicien'),
  makeProgram(undefined, "Électricité d'Installation", 'Technicien'),
  makeProgram(undefined, 'Maintenance Industrielle', 'Technicien'),
  makeProgram(undefined, 'Bureautique', 'Qualification', 'Microsoft Office'),
  makeProgram(undefined, 'Gestion des Entreprises', 'Continuing Education (Cours du Soir)', 'Technicien Spécialisé · Comptabilité et Finance'),
  makeProgram(undefined, 'Bureauticien en Microsoft Office', 'Continuing Education (Cours du Soir)', 'Technicien'),
];

export function getProgramsForInstitution(institution: string): EducationProgram[] {
  if ((publicHighSchools as readonly string[]).includes(institution)) {
    return highSchoolPrograms(publicSchoolStreams[institution as (typeof publicHighSchools)[number]]);
  }
  if ((privateHighSchools as readonly string[]).includes(institution)) return highSchoolPrograms();
  if (institution === trainingInstitutions.est) return estPrograms;
  if (institution === trainingInstitutions.ista2) return ista2Programs;
  if (institution === trainingInstitutions.higherApplied) return higherAppliedPrograms;
  return [];
}

export function getAllEducationPrograms(): EducationProgram[] {
  const programs = [
    ...highSchoolPrograms(),
    ...estPrograms,
    ...ista2Programs,
    ...higherAppliedPrograms,
  ];
  return [...new Map(programs.map(program => [program.value, program])).values()];
}

export function isValidEducationSelection(institution: string, program: string) {
  return educationInstitutions.some(item => item.name === institution)
    && getProgramsForInstitution(institution).some(item => item.value === program);
}
