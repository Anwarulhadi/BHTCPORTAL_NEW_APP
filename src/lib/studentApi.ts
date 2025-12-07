export type StudentFilterParams = {
  batchNumber?: string;
  gradeFilter?: string;
  genderFilter?: string;
};

/**
 * Builds a backend request that carries all active filters so the server
 * can run the combined query (batch + grade + gender) efficiently.
 */
export const fetchStudentsWithFilters = async (filters: StudentFilterParams) => {
  const params = new URLSearchParams();

  if (filters.batchNumber && filters.batchNumber !== 'all') {
    params.append('batchNumber', filters.batchNumber);
  }

  if (filters.gradeFilter && filters.gradeFilter !== 'all') {
    params.append('gradeFilter', filters.gradeFilter);
  }

  if (filters.genderFilter && filters.genderFilter !== 'all') {
    params.append('genderFilter', filters.genderFilter);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/students?${queryString}` : '/api/students';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch students with the provided filters.');
  }

  return response.json();
};
