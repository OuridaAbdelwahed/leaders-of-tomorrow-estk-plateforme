import { describe, expect, it } from 'vitest';
import { getProgramsForInstitution, isValidEducationSelection, trainingInstitutions } from './education';

describe('education catalog', () => {
  it('uses the supplied lycée-specific streams', () => {
    expect(getProgramsForInstitution('Lycée Zerktouni').map(item => item.code)).toEqual(['SPC', 'SVT', 'SEG', 'SGC']);
  });

  it('offers the complete lycée catalog for private schools', () => {
    expect(getProgramsForInstitution('Al Hikma')).toHaveLength(13);
  });

  it('groups all EST programs in the shared catalog', () => {
    expect(getProgramsForInstitution(trainingInstitutions.est)).toHaveLength(15);
  });

  it('rejects a program that does not belong to the selected institution', () => {
    const estProgram = getProgramsForInstitution(trainingInstitutions.est)[0].value;
    expect(isValidEducationSelection('Lycée Mohammed V', estProgram)).toBe(false);
  });
});
