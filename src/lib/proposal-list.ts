interface SearchableProposal { title: string; client_name: string; client_contact: string | null; client_email: string | null; status: string; }
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
export function filterProposals<T extends SearchableProposal>(rows: T[], search: string, status = "all") {
  const query = normalize(search.trim());
  return rows.filter((row) => (status === "all" || row.status === status) && normalize([row.title, row.client_name, row.client_contact, row.client_email].join(" ")).includes(query));
}
export function paginateProposals<T>(rows: T[], requestedPage: number, size: number) {
  const pageSize = Math.max(1, size);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(pages, Math.max(1, requestedPage));
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pages, total: rows.length };
}