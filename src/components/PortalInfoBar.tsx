import { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Thermometer, DollarSign, Calendar, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "@/i18n/LanguageContext";

interface WeatherData {
  temperature: number;
  code: number;
  city: string;
}

interface CurrencyRates {
  usdGnf: number | null;
  eurUsd: number | null;
}

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun size={14} className="text-amber-400" />;
  if (code >= 2 && code <= 3) return <Cloud size={14} className="text-muted-foreground" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle size={14} className="text-sky-400" />;
  if (code >= 61 && code <= 67) return <CloudRain size={14} className="text-sky-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={14} className="text-sky-200" />;
  if (code >= 95 && code <= 99) return <CloudLightning size={14} className="text-amber-500" />;
  return <Cloud size={14} className="text-muted-foreground" />;
}

function getWeatherLabel(code: number, locale: string): string {
  const map: Record<string, [string, string]> = {
    clear: ["Ensoleillé", "Sunny"],
    cloudy: ["Nuageux", "Cloudy"],
    drizzle: ["Bruine", "Drizzle"],
    rain: ["Pluie", "Rain"],
    snow: ["Neige", "Snow"],
    storm: ["Orage", "Storm"],
  };
  const i = locale === "fr" ? 0 : 1;
  if (code <= 1) return map.clear[i];
  if (code <= 3) return map.cloudy[i];
  if (code <= 57) return map.drizzle[i];
  if (code <= 67) return map.rain[i];
  if (code <= 77) return map.snow[i];
  if (code <= 99) return map.storm[i];
  return map.cloudy[i];
}

function InfoChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 text-xs font-medium text-foreground/80 whitespace-nowrap transition-colors hover:bg-background/80 ${className}`}>
      {children}
    </div>
  );
}

export function PortalInfoBar() {
  const { locale } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [rates, setRates] = useState<CurrencyRates>({ usdGnf: null, eurUsd: null });
  const now = new Date();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            );
            const data = await res.json();
            const cw = data.current_weather;

            let city = "";
            try {
              const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${locale}`
              );
              const nomData = await nomRes.json();
              city = nomData.address?.city || nomData.address?.town || nomData.address?.village || "";
            } catch { city = ""; }

            setWeather({ temperature: Math.round(cw.temperature), code: cw.weathercode, city });
          } catch (e) { console.error("Weather fetch error:", e); }
        },
        () => {
          fetch("https://api.open-meteo.com/v1/forecast?latitude=45.5&longitude=-73.57&current_weather=true")
            .then(r => r.json())
            .then(data => {
              const cw = data.current_weather;
              setWeather({ temperature: Math.round(cw.temperature), code: cw.weathercode, city: "Montréal" });
            })
            .catch(() => {});
        }
      );
    }
  }, [locale]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [usdRes, eurRes] = await Promise.all([
          fetch("https://open.er-api.com/v6/latest/USD"),
          fetch("https://open.er-api.com/v6/latest/EUR"),
        ]);
        const usdData = await usdRes.json();
        const eurData = await eurRes.json();
        setRates({
          usdGnf: usdData.rates?.GNF ?? null,
          eurUsd: eurData.rates?.USD ?? null,
        });
      } catch (e) { console.error("Currency fetch error:", e); }
    };
    fetchRates();
  }, []);

  const dateStr = format(now, locale === "fr" ? "EEEE d MMMM yyyy" : "EEEE, MMMM d, yyyy", {
    locale: locale === "fr" ? fr : undefined,
  });

  const timeStr = format(now, "HH:mm");

  return (
    <div className="w-full bg-gradient-to-r from-[hsl(var(--primary)/0.08)] via-background to-[hsl(var(--primary)/0.05)] border-b border-border/40 px-3 sm:px-4 py-1.5">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {/* Date & time */}
        <InfoChip>
          <Calendar size={13} className="text-primary shrink-0" />
          <span className="capitalize hidden sm:inline">{dateStr}</span>
          <span className="capitalize sm:hidden">{format(now, locale === "fr" ? "d MMM" : "MMM d", { locale: locale === "fr" ? fr : undefined })}</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums">{timeStr}</span>
        </InfoChip>

        {/* Weather */}
        {weather && (
          <InfoChip>
            {getWeatherIcon(weather.code)}
            <span className="tabular-nums font-semibold">{weather.temperature}°C</span>
            <span className="text-muted-foreground hidden md:inline">{getWeatherLabel(weather.code, locale)}</span>
            {weather.city && (
              <>
                <MapPin size={11} className="text-primary/60 shrink-0" />
                <span className="text-muted-foreground hidden lg:inline">{weather.city}</span>
              </>
            )}
          </InfoChip>
        )}

        {/* Spacer pushes currencies to the right on larger screens */}
        <div className="flex-1 min-w-0" />

        {/* Currency rates */}
        {rates.usdGnf !== null && (
          <InfoChip>
            <DollarSign size={13} className="text-primary shrink-0" />
            <span className="font-semibold text-foreground">USD/GNF</span>
            <span className="text-border mx-0.5">:</span>
            <span className="tabular-nums">
              {rates.usdGnf.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 })}
            </span>
          </InfoChip>
        )}

        {rates.eurUsd !== null && (
          <InfoChip>
            <TrendingUp size={13} className="text-primary shrink-0" />
            <span className="font-semibold text-foreground">EUR/USD</span>
            <span className="text-border mx-0.5">:</span>
            <span className="tabular-nums">
              {rates.eurUsd.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
            </span>
          </InfoChip>
        )}
      </div>
    </div>
  );
}
