export const calculateGradeLetter = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

export const calculateAverageGrade = (grades: number[]): number => {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, grade) => acc + grade, 0);
  return sum; // Return sum of all grades, not average
};

// Extracts the score (number before the slash) from inputs like "10/15".
// If the input is a plain number string (e.g., "85"), returns that as score.
export const extractScore = (input: string | number): number => {
  if (typeof input === 'number') return input;
  const trimmed = input.trim();
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx > -1) {
    const scorePart = trimmed.slice(0, slashIdx).trim();
    const score = parseInt(scorePart, 10);
    return isNaN(score) ? 0 : score;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? 0 : n;
};

// Parses grade input like "10/15" into score and total.
export const parseGradeInput = (input: string | number): { score: number; total?: number } => {
  if (typeof input === 'number') return { score: input };
  const trimmed = input.trim();
  const parts = trimmed.split('/');
  if (parts.length === 2) {
    const score = parseInt(parts[0].trim(), 10);
    const total = parseInt(parts[1].trim(), 10);
    return {
      score: isNaN(score) ? 0 : score,
      total: isNaN(total) ? undefined : total,
    };
  }
  const score = parseInt(trimmed, 10);
  return { score: isNaN(score) ? 0 : score };
};

// Sums scores from mixed inputs (numbers or "score/total" strings)
export const sumScores = (inputs: Array<string | number>): number => {
  return inputs.reduce((acc, v) => acc + extractScore(v), 0);
};
