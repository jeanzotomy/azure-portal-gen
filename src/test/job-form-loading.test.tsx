import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HrJobFormPage from "@/pages/hr/HrJobFormPage";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), load: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: () => ({ user: { id: "hr-user" } }) }));
vi.mock("@/components/hr/JobApplicationsStats", () => ({ default: () => null }));

const key = "hr_job_page_draft_offer-1";
const job = {
  title: "Ingénieur Cloud", location: "Télétravail", description: "Administrer les infrastructures Cloud.",
  department: "Ingénierie", sector: "IT", contract_type: "CDI", closing_date: "2026-11-30",
  status: "publiee", start_date: "2026-12-01", salary_range: "Selon expérience",
  contract_duration: null, renewable: false, candidates_sought: 3,
};
const open = (base = "admin") => render(
  <MemoryRouter initialEntries={[`/${base}/offres/offer-1`]}>
    <Routes><Route path={`/${base}/offres/:id`} element={<HrJobFormPage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  mocks.load.mockResolvedValue({ data: job, error: null });
  mocks.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mocks.from.mockImplementation((table: string) => table === "job_postings"
    ? { select: () => ({ eq: () => ({ maybeSingle: mocks.load }) }), update: mocks.update }
    : { select: () => ({ order: () => Promise.resolve({ data: [] }) }) });
});
afterEach(cleanup);

describe("chargement d'une offre existante", () => {
  it.each(["admin", "rh"])("charge les données avant le brouillon dans %s et conserve les champs à l'enregistrement", async (base) => {
    open(base);
    expect(sessionStorage.getItem(key)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText(/Titre du poste/)).toHaveValue(job.title));
    expect(screen.getByLabelText(/Description/, { selector: "textarea" })).toHaveValue(job.description);
    fireEvent.change(screen.getByLabelText("Date de clôture"), { target: { value: "2026-12-15" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      title: job.title, location: job.location, description: job.description,
      closing_date: "2026-12-15", candidates_sought: 3, salary_range: job.salary_range,
    })));
  });

  it("restaure les modifications non enregistrées", async () => {
    sessionStorage.setItem(key, JSON.stringify({ form: { ...job, title: "Titre en cours", candidates_sought: "3" }, aiPrompt: "Ton concis" }));
    open();
    await waitFor(() => expect(screen.getByLabelText(/Titre du poste/)).toHaveValue("Titre en cours"));
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("ignore le brouillon vide laissé par l'ancien comportement", async () => {
    sessionStorage.setItem(key, JSON.stringify({ form: {
      title: "", department: "", location: "", contract_type: "CDI", description: "",
      closing_date: "", status: "brouillon", sector: "", start_date: "",
      salary_range: "", contract_duration: "", renewable: false, candidates_sought: "1",
    }, aiPrompt: "" }));
    open();
    await waitFor(() => expect(screen.getByLabelText(/Titre du poste/)).toHaveValue(job.title));
    expect(mocks.load).toHaveBeenCalledOnce();
  });
});