import { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Thermometer, DollarSign, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "@/i18n/LanguageContext";

interface WeatherData {
  temperature: number;
  description: string;
  code: number;
  city: string;
}

interface CurrencyRates {
  usdGnf: number | null;
  eurUsd: number | null;
}

function getWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun size={16} className="text-yellow-500" />;
  if (code >= 2 && code <= 3) return <Cloud size={16} className="text-muted-foreground" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle size={16} className="text-blue-400" />;
  if (code >= 61 && code <= 67) return <CloudRain size={16} className="text-blue-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={16} className="text-blue-200" />;
  if (code >= 95 && code <= 99) return <CloudLightning size={16} className="text-yellow-600" />;
  return <Cloud size={16} className="text-muted-foreground" />;
}

function getWeatherDescription(code: number, locale: string): string {
  const descriptions: Record<string, [string, string]> = {
    clear: ["Clair", "Clear"],
    cloudy: ["Nuageux", "Cloudy"],
    drizzle: ["Bruine", "Drizzle"],
    rain: ["Pluie", "Rain"],
    snow: ["Neige", "Snow"],
    storm: ["Orage", "Storm"],
  };
  const i = locale === "fr" ? 0 : 1;
  if (code <= 1) return descriptions.clear[i];
  if (code <= 3) return descriptions.cloudy[i];
  if (code <= 57) return descriptions.drizzle[i];
  if (code <= 67) return descriptions.rain[i];
  if (code <= 77) return descriptions.snow[i];
  if (code <= 99) return descriptions.storm[i];
  return descriptions.cloudy[i];
}

export function PortalInfoBar() {
  const { locale } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [rates, setRates] = useState<CurrencyRates>({ usdGnf: null, eurUsd: null });
  const now = new Date();

  useEffect(() => {
    // Fetch weather using geolocation + Open-Meteo (free, no key)
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
            
            // Reverse geocode for city name
            let city = "";
            try {
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&latitude=${latitude}&longitude=${longitude}`
              );
              // Fallback: use nominatim
              const nomRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${locale}`
              );
              const nomData = await nomRes.json();
              city = nomData.address?.city || nomData.address?.town || nomData.address?.village || "";
            } catch {
              city = "";
            }

            setWeather({
              temperature: Math.round(cw.temperature),
              code: cw.weathercode,
              description: getWeatherDescription(cw.weathercode, locale),
              city,
            });
          } catch (e) {
            console.error("Weather fetch error:", e);
          }
        },
        () => {
          // Geolocation denied - use default (Montreal)
          fetch("https://api.open-meteo.com/v1/forecast?latitude=45.5&longitude=-73.57&current_weather=true")
            .then(r => r.json())
            .then(data => {
              const cw = data.current_weather;
              setWeather({
                temperature: Math.round(cw.temperature),
                code: cw.weathercode,
                description: getWeatherDescription(cw.weathercode, locale),
                city: "Montréal",
              });
            })
            .catch(() => {});
        }
      );
    }
  }, [locale]);

  useEffect(() => {
    // Fetch currency rates
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
      } catch (e) {
        console.error("Currency fetch error:", e);
      }
    };
    fetchRates();
  }, []);

  const dateStr = format(now, locale === "fr" ? "EEEE d MMMM yyyy" : "EEEE, MMMM d, yyyy", {
    locale: locale === "fr" ? fr : undefined,
  });

  return (
    <div className="w-full bg-muted/50 border-b border-border px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground overflow-x-auto flex-wrap">
      {/* Date */}
      <div className="flex items-center gap-1.5 capitalize whitespace-nowrap">
        <Calendar size={14} />
        <span>{dateStr}</span>
      </div>

      <span className="text-border">|</span>

      {/* Weather */}
      {weather && (
        <>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {getWeatherIcon(weather.code)}
            <span>{weather.temperature}°C</span>
            <span className="text-muted-foreground/70">· {weather.description}</span>
            {weather.city && (
              <span className="flex items-center gap-0.5 text-muted-foreground/70">
                <MapPin size={12} /> {weather.city}
              </span>
            )}
          </div>
          <span className="text-border">|</span>
        </>
      )}

      {/* Currency rates */}
      <div className="flex items-center gap-3 whitespace-nowrap">
        <DollarSign size={14} />
        {rates.usdGnf !== null && (
          <span>
            <span className="font-medium text-foreground">USD/GNF</span>{" "}
            {rates.usdGnf.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 })}
          </span>
        )}
        {rates.eurUsd !== null && (
          <span>
            <span className="font-medium text-foreground">EUR/USD</span>{" "}
            {rates.eurUsd.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </span>
        )}
        {rates.usdGnf === null && rates.eurUsd === null && <span>…</span>}
      </div>
    </div>
  );
}
