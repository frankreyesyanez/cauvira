export function getListingEmptyMessage(query?: string) {
  if (query?.trim()) {
    return `No encontramos resultados para “${query.trim()}”. Solicita una solución y la buscaremos por ti.`;
  }

  return "No encontramos productos publicados. Solicita una solución y la buscaremos por ti.";
}
