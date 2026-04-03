export const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");

  // If body is FormData, DON'T set Content-Type
  const isFormData = options.body instanceof FormData;

  return fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};
