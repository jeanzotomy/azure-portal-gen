import { forwardRef } from "react";
import { ShieldCheck, Award } from "lucide-react";

export type BadgeData = {
  candidate_name: string;
  training_title: string;
  verification_code: string;
  score: number | null;
  issued_at: string;
};

/**
 * Visual sharable badge (1200x630 OG-friendly ratio). Designed to be
 * rendered offscreen and exported as PNG via html2canvas.
 */
export const CertificateBadge = forwardRef<HTMLDivElement, { data: BadgeData }>(
  ({ data }, ref) => {
    const issued = new Date(data.issued_at).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          background:
            "linear-gradient(135deg, #003d66 0%, #0099cc 55%, #00c2d6 100%)",
          color: "white",
          padding: 64,
          position: "relative",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Decorative rings */}
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -180,
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.08)",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="/logo.webp"
            alt="CloudMature"
            crossOrigin="anonymous"
            style={{
              height: 56,
              width: "auto",
              filter: "brightness(0) invert(1)",
            }}
          />
          <div
            style={{
              fontSize: 13,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#cdeefd",
              borderLeft: "1px solid rgba(255,255,255,0.25)",
              paddingLeft: 16,
            }}
          >
            Certificat officiel
          </div>
        </div>

        {/* Big title */}
        <div style={{ marginTop: 70 }}>
          <div style={{ fontSize: 22, color: "#bde6f8", marginBottom: 12 }}>
            Décerné à
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.5px",
              maxWidth: 900,
            }}
          >
            {data.candidate_name}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 22,
              color: "#bde6f8",
              marginBottom: 10,
            }}
          >
            Pour la formation
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              maxWidth: 900,
              lineHeight: 1.15,
            }}
          >
            {data.training_title}
          </div>
        </div>

        {/* Footer line */}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 56,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#9fd8f0", letterSpacing: 2, textTransform: "uppercase" }}>
              Délivré en
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{issued}</div>
          </div>

          {data.score != null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "10px 18px",
                borderRadius: 999,
              }}
            >
              <Award size={20} color="#ffd76b" />
              <span style={{ fontSize: 20, fontWeight: 700 }}>
                Score : {data.score}%
              </span>
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#9fd8f0", letterSpacing: 2, textTransform: "uppercase" }}>
              Code de vérification
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 22,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {data.verification_code}
            </div>
            <div style={{ fontSize: 13, color: "#9fd8f0", marginTop: 4 }}>
              cloudmature.com/verify/{data.verification_code}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateBadge.displayName = "CertificateBadge";
