import logo from "@/assets/cloudmature-logo.png";

/** Identité reprise de l'en-tête des factures CloudMature. */
export const documentBrand = {
  name: "Cloud Mature",
  tagline: "Innover • Optimiser • Automatiser",
  address: "Kipé Centre Émetteur, C/Ratoma",
  city: "Conakry, Guinée",
  email: "info@cloudmature.com",
  phone: "+224 626 441 150",
  website: "www.cloudmature.com",
  logo,
};

export async function loadDocumentBrand() {
  const css = getComputedStyle(document.documentElement);
  const color = (name: string) => css.getPropertyValue(`--document-${name}`).trim().replace("#", "");
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Le logo CloudMature ne peut pas être chargé"));
    img.src = logo;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Préparation du logo impossible");
  context.drawImage(image, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  return { dataUrl, bytes, colors: { primary: color("primary"), ink: color("ink"), muted: color("muted"), surface: color("surface"), border: color("border"), paper: color("paper") } };
}