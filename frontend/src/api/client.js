let cachedCsrfToken = null;

export function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/auth/csrf/', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch (err) {
    console.warn('Could not fetch CSRF token proactively:', err);
  }
  return getCookie('csrftoken') || cachedCsrfToken;
}

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  // Attach CSRF token on mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let csrfToken = getCookie('csrftoken') || cachedCsrfToken;
    if (!csrfToken) {
      csrfToken = await fetchCsrfToken();
    }
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  });

  if (response.status === 204) {
    return null;
  }

  let responseData;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const error = new Error(
      responseData?.detail ||
      responseData?.message ||
      (typeof responseData === 'object' ? JSON.stringify(responseData) : responseData) ||
      `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}

// Multi-role Auth API
export const authApi = {
  login: async (credentials) => {
    await fetchCsrfToken();
    const data = await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: credentials,
    });
    if (data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
    return data;
  },
  logout: () => apiRequest('/api/auth/logout/', { method: 'POST' }),
  getMe: () => apiRequest('/api/auth/me/'),
  getCsrf: fetchCsrfToken,
};

// Exam Platform Core APIs
export const examsApi = {
  getDashboardStats: () => apiRequest('/api/dashboard-stats/'),
  
  // Institution & Custom Branding
  getInstitution: () => apiRequest('/api/institutions/current/'),
  updateBranding: (data) => apiRequest('/api/institutions/update_branding/', { method: 'PATCH', body: data }),
  
  // Batches
  listBatches: () => apiRequest('/api/batches/'),
  createBatch: (data) => apiRequest('/api/batches/', { method: 'POST', body: data }),
  deleteBatch: (id) => apiRequest(`/api/batches/${id}/`, { method: 'DELETE' }),

  // Subjects & Topics
  listSubjects: () => apiRequest('/api/subjects/'),
  createSubject: (data) => apiRequest('/api/subjects/', { method: 'POST', body: data }),
  addTopic: (subjectId, name) => apiRequest(`/api/subjects/${subjectId}/add_topic/`, { method: 'POST', body: { name } }),

  // Question Bank
  listQuestions: (params = {}) => {
    const q = new URLSearchParams();
    if (params.subject) q.append('subject', params.subject);
    if (params.difficulty) q.append('difficulty', params.difficulty);
    if (params.question_type) q.append('question_type', params.question_type);
    if (params.search) q.append('search', params.search);
    const qs = q.toString();
    return apiRequest(`/api/questions/${qs ? '?' + qs : ''}`);
  },
  createQuestion: (data) => apiRequest('/api/questions/', { method: 'POST', body: data }),
  updateQuestion: (id, data) => apiRequest(`/api/questions/${id}/`, { method: 'PATCH', body: data }),
  deleteQuestion: (id) => apiRequest(`/api/questions/${id}/`, { method: 'DELETE' }),
  bulkImportQuestions: (csvText) => apiRequest('/api/questions/bulk_import/', { method: 'POST', body: { csv_text: csvText } }),

  // Subscription & Audit
  getSubscriptionUsage: () => apiRequest('/api/institutions/subscription_usage/'),
  getAuditLogs: () => apiRequest('/api/institutions/audit_logs/'),

  // Exams
  listExams: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    const qs = q.toString();
    return apiRequest(`/api/exams/${qs ? '?' + qs : ''}`);
  },
  getExam: (id) => apiRequest(`/api/exams/${id}/`),
  createExam: (data) => apiRequest('/api/exams/', { method: 'POST', body: data }),
  updateExam: (id, data) => apiRequest(`/api/exams/${id}/`, { method: 'PATCH', body: data }),
  deleteExam: (id) => apiRequest(`/api/exams/${id}/`, { method: 'DELETE' }),
  addQuestionsToExam: (examId, questionIds, marks, negativeMarks) => 
    apiRequest(`/api/exams/${examId}/add_questions/`, { method: 'POST', body: { question_ids: questionIds, marks, negative_marks: negativeMarks } }),
  removeQuestionFromExam: (examId, questionId) => 
    apiRequest(`/api/exams/${examId}/remove_question/`, { method: 'POST', body: { question_id: questionId } }),
  publishResults: (examId, publish = true) => 
    apiRequest(`/api/exams/${examId}/publish_results/`, { method: 'POST', body: { publish } }),
  getExamAnalytics: (examId) => apiRequest(`/api/exams/${examId}/analytics/`),
  recalculateRanks: (examId) => apiRequest(`/api/exams/${examId}/recalculate_ranks/`, { method: 'POST' }),
  exportResultsCsvUrl: (examId) => `/api/exams/${examId}/export_results_csv/`,
  getPrintableMeritListUrl: (examId) => `/api/exams/${examId}/printable_merit_list/`,
  getPrintableScorecardUrl: (examId, attemptId) => `/api/exams/${examId}/student_scorecard/?attempt_id=${attemptId}`,

  // Proctoring & Integrity Overrides
  getProctoringReport: (examId) => apiRequest(`/api/exams/${examId}/proctoring_report/`),
  grantReattempt: (examId, payload) => apiRequest(`/api/exams/${examId}/grant_reattempt/`, { method: 'POST', body: payload }),
  resetStudentAttempt: (examId, payload) => apiRequest(`/api/exams/${examId}/reset_student_attempt/`, { method: 'POST', body: payload }),

  // Students Management
  listStudents: () => apiRequest('/api/students/'),
  enrollStudent: (data) => apiRequest('/api/students/enroll_student/', { method: 'POST', body: data }),
  bulkImportStudents: (csvText) => apiRequest('/api/students/bulk_import/', { method: 'POST', body: { csv_text: csvText } }),

  // Announcements
  listAnnouncements: () => apiRequest('/api/announcements/'),
  createAnnouncement: (data) => apiRequest('/api/announcements/', { method: 'POST', body: data }),
};

// Student Portal Live Exam APIs
export const studentApi = {
  getAvailableExams: () => apiRequest('/api/student-portal/available_exams/'),
  startAttempt: (examId) => apiRequest(`/api/student-portal/${examId}/start_attempt/`, { method: 'POST' }),
  saveAnswer: (payload) => apiRequest('/api/student-portal/save_answer/', { method: 'POST', body: payload }),
  submitAttempt: (attemptId) => apiRequest('/api/student-portal/submit_attempt/', { method: 'POST', body: { attempt_id: attemptId } }),
  getScorecard: (attemptId) => apiRequest(`/api/student-portal/scorecard/?attempt_id=${attemptId}`),
  getHistory: () => apiRequest('/api/student-portal/history/'),
  logTelemetry: (payload) => apiRequest('/api/student-portal/log_telemetry/', { method: 'POST', body: payload }),
  getPrintableScorecardUrl: (attemptId) => `/api/student-portal/printable_scorecard/?attempt_id=${attemptId}`,
};

// Legacy System Admin APIs
export const statsApi = {
  getOverview: () => apiRequest('/api/admin/dashboard/stats/'),
};

export const usersApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return apiRequest(`/api/admin/users/${qs ? '?' + qs : ''}`);
  },
  create: (data) => apiRequest('/api/admin/users/', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/api/admin/users/${id}/`, { method: 'PATCH', body: data }),
  delete: (id) => apiRequest(`/api/admin/users/${id}/`, { method: 'DELETE' }),
};

export const resourcesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return apiRequest(`/api/admin/resources/${qs ? '?' + qs : ''}`);
  },
  create: (data) => apiRequest('/api/admin/resources/', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/api/admin/resources/${id}/`, { method: 'PATCH', body: data }),
  delete: (id) => apiRequest(`/api/admin/resources/${id}/`, { method: 'DELETE' }),
};

export const auditApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    const qs = query.toString();
    return apiRequest(`/api/admin/audit-logs/${qs ? '?' + qs : ''}`);
  },
};
