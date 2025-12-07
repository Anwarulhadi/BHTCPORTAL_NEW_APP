export interface StudentNameMetadata {
  realName: string;
  batch?: string;
  gender?: string;
  showGradeLetter?: boolean;
  course?: string;
  extraTokens: string[];
}

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

export const parseStudentNameMetadata = (rawName: string | null | undefined): StudentNameMetadata => {
  if (!rawName) {
    return { realName: '', extraTokens: [] };
  }

  const segments = rawName.split('|||');
  const realName = segments.shift()?.trim() ?? '';
  const metadata: StudentNameMetadata = {
    realName,
    extraTokens: [],
  };

  let legacyBatchCaptured = false;

  segments.forEach((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    if (lower.startsWith('batch=')) {
      metadata.batch = trimmed.slice(6).trim();
      return;
    }

    if (lower.startsWith('gender=')) {
      metadata.gender = trimmed.slice(7).trim();
      return;
    }

    if (lower.startsWith('gradeletter=')) {
      const value = trimmed.slice(12).trim().toLowerCase();
      if (TRUE_VALUES.has(value)) {
        metadata.showGradeLetter = true;
      } else if (FALSE_VALUES.has(value)) {
        metadata.showGradeLetter = false;
      }
      return;
    }

    if (lower.startsWith('course=')) {
      metadata.course = trimmed.slice(7).trim();
      return;
    }

    if (!metadata.batch && !legacyBatchCaptured) {
      metadata.batch = trimmed;
      legacyBatchCaptured = true;
      return;
    }

    metadata.extraTokens.push(trimmed);
  });

  return metadata;
};

export const buildStudentNameWithMetadata = (metadata: StudentNameMetadata): string => {
  const parts: string[] = [];
  parts.push(metadata.realName.trim());

  if (metadata.batch) {
    parts.push(`batch=${metadata.batch}`);
  }
  if (metadata.gender) {
    parts.push(`gender=${metadata.gender}`);
  }
  if (metadata.course) {
    parts.push(`course=${metadata.course}`);
  }
  metadata.extraTokens
    .filter((token) => token && !token.toLowerCase().startsWith('gradeletter='))
    .forEach((token) => parts.push(token));

  if (typeof metadata.showGradeLetter === 'boolean') {
    parts.push(`gradeLetter=${metadata.showGradeLetter ? 'on' : 'off'}`);
  }

  return parts.join('|||');
};

export const updateGradeLetterFlagInName = (rawName: string, visible: boolean): string => {
  const metadata = parseStudentNameMetadata(rawName);
  metadata.showGradeLetter = visible;
  return buildStudentNameWithMetadata(metadata);
};
