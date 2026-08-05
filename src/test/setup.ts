import '@testing-library/jest-dom/vitest';

// Cada teste começa com LocalStorage limpo — senão a persistência
// de um teste vaza para o seguinte.
beforeEach(() => {
  localStorage.clear();
});
