import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

const API_BASE = "https://aqi-backend-xlo9.onrender.com";
const API_URL = import.meta.env.VITE_API_URL || `${API_BASE}/predict-all-cities`;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REQUESTED_CITIES = [
  "Delhi",
  "Mumbai",
  "Hyderabad",
  "Bangalore",
  "Kolkata",
  "Chennai",
  "Beijing",
];

const AQI_BANDS = [
  {
    max: 50,
    label: "Good",
    pill: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
    glow: "from-emerald-400/45 via-emerald-500/20 to-cyan-400/10",
    border: "border-emerald-400/30",
    accent: "#34d399",
    surface: "from-emerald-500/20 via-slate-950/78 to-slate-950/95",
  },
  {
    max: 100,
    label: "Moderate",
    pill: "bg-yellow-400/20 text-yellow-100 ring-yellow-300/30",
    glow: "from-yellow-300/40 via-amber-400/20 to-slate-950/10",
    border: "border-yellow-300/30",
    accent: "#facc15",
    surface: "from-yellow-300/18 via-slate-950/80 to-slate-950/95",
  },
  {
    max: 150,
    label: "Unhealthy for Sensitive Groups",
    pill: "bg-orange-500/20 text-orange-100 ring-orange-300/30",
    glow: "from-orange-500/45 via-amber-500/18 to-slate-950/10",
    border: "border-orange-300/30",
    accent: "#fb923c",
    surface: "from-orange-500/22 via-slate-950/82 to-slate-950/95",
  },
  {
    max: 200,
    label: "Unhealthy",
    pill: "bg-red-500/20 text-red-100 ring-red-300/30",
    glow: "from-red-500/45 via-rose-500/18 to-slate-950/10",
    border: "border-red-300/30",
    accent: "#f87171",
    surface: "from-red-500/24 via-slate-950/82 to-slate-950/95",
  },
  {
    max: Number.POSITIVE_INFINITY,
    label: "Very Unhealthy",
    pill: "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-300/30",
    glow: "from-fuchsia-500/45 via-violet-500/18 to-slate-950/10",
    border: "border-fuchsia-300/30",
    accent: "#d946ef",
    surface: "from-fuchsia-500/24 via-slate-950/82 to-slate-950/95",
  },
];

function getAqiBand(aqi) {
  return AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

function formatAqi(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "--";
}

function buildRequestUrl() {
  const url = new URL(API_URL);
  REQUESTED_CITIES.forEach((city) => {
    url.searchParams.append("cities", city);
  });
  return url.toString();
}

function toCityCards(payload) {
  return REQUESTED_CITIES.map((cityName) => {
    const values =
      payload[cityName] ??
      payload[cityName.toLowerCase()] ??
      payload[cityName === "Bangalore" ? "Bengaluru" : cityName];

    if (!values) {
      return null;
    }

    return {
      name: cityName,
      currentAqi: Number(values.current_aqi),
      predictedAqi: Number(values.predicted_aqi),
    };
  }).filter(Boolean);
}

function getTrend(city) {
  if (city.predictedAqi > city.currentAqi) {
    return { label: "Rising", icon: "\u2191", tone: "text-rose-300" };
  }
  if (city.predictedAqi < city.currentAqi) {
    return { label: "Improving", icon: "\u2193", tone: "text-emerald-300" };
  }
  return { label: "Stable", icon: "\u2192", tone: "text-slate-300" };
}

function getSuggestion(aqi) {
  if (aqi > 200) {
    return "Stay indoors when possible and use a protective mask if you need to go out.";
  }
  if (aqi > 150) {
    return "Avoid outdoor activity and reduce prolonged exposure.";
  }
  if (aqi > 100) {
    return "Sensitive groups should limit strenuous outdoor activity.";
  }
  if (aqi > 50) {
    return "Air quality is acceptable, but reduce long outdoor workouts if discomfort appears.";
  }
  return "Air quality is good for outdoor activity.";
}

function CityTrendChart({ currentAqi, predictedAqi, color }) {
  const points = [
    { label: "Current", aqi: Number(currentAqi.toFixed(2)) },
    { label: "Predicted", aqi: Number(predictedAqi.toFixed(2)) },
  ];
  const gradientId = `trend-${color.replace("#", "")}`;

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 0, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.55} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={["dataMin - 8", "dataMax + 8"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: `${color}55`,
              borderRadius: 14,
              color: "#e2e8f0",
            }}
            formatter={(value) => [formatAqi(Number(value)), "AQI"]}
          />
          <Area type="monotone" dataKey="aqi" stroke="none" fill={`url(#${gradientId})`} fillOpacity={1} />
          <Line
            type="monotone"
            dataKey="aqi"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PollutionOverviewChart({ cities }) {
  const chartData = cities.map((city) => ({
    name: city.name,
    current: Number(city.currentAqi.toFixed(1)),
    predicted: Number(city.predictedAqi.toFixed(1)),
    color: getAqiBand(city.currentAqi).accent,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "rgba(56, 189, 248, 0.25)",
              borderRadius: 14,
              color: "#e2e8f0",
            }}
          />
          <Legend wrapperStyle={{ color: "#cbd5e1", paddingTop: 8 }} />
          <Bar dataKey="current" radius={[8, 8, 0, 0]} barSize={24} name="Current AQI">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} fillOpacity={0.75} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted AQI"
            stroke="#7dd3fc"
            strokeWidth={3}
            dot={{ r: 4, fill: "#7dd3fc", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#e0f2fe" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function InteractiveDashboardApp() {
  const [cities, setCities] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const fetchPredictions = useEffectEvent(async () => {
    if (cities.length === 0) {
      setStatus("loading");
    }
    setErrorMessage("");

    try {
      const response = await fetch(buildRequestUrl());
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const nextCities = toCityCards(payload);

      startTransition(() => {
        setCities(nextCities);
        setSelectedCity((currentSelection) => {
          if (currentSelection && nextCities.some((city) => city.name === currentSelection)) {
            return currentSelection;
          }
          return nextCities[0]?.name ?? "";
        });
        setStatus("ready");
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load AQI data.");
    }
  });

  useEffect(() => {
    fetchPredictions();
    const intervalId = window.setInterval(fetchPredictions, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchPredictions]);

  const mostPollutedCity = [...cities].sort((left, right) => right.currentAqi - left.currentAqi)[0];
  const averageAqi =
    cities.length > 0
      ? cities.reduce((sum, city) => sum + city.currentAqi, 0) / cities.length
      : 0;
  const risingCities = cities.filter((city) => city.predictedAqi > city.currentAqi).length;
  const selectedCityData = cities.find((city) => city.name === selectedCity) ?? cities[0];
  const selectedBand = selectedCityData ? getAqiBand(selectedCityData.currentAqi) : AQI_BANDS[0];
  const selectedTrend = selectedCityData ? getTrend(selectedCityData) : getTrend({ currentAqi: 0, predictedAqi: 0 });

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,1))]" />
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                  Real-time AQI Monitor
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  AI Air Quality Intelligence Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Live current AQI and backend model predictions for six major Indian cities, refreshed every five minutes.
                </p>
                <p className="mt-3 text-sm text-sky-100/80">
                  {lastUpdated ? `Last updated at ${lastUpdated}` : "Waiting for first live update"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:min-w-[420px]">
                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Selected City</p>
                  <p className="mt-3 text-2xl font-bold text-white">{selectedCityData?.name ?? "--"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    AQI {selectedCityData ? formatAqi(selectedCityData.currentAqi) : "--"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Average AQI</p>
                  <p className="mt-3 text-2xl font-bold text-white">{cities.length ? formatAqi(averageAqi) : "--"}</p>
                  <p className="mt-1 text-sm text-slate-300">Across {cities.length || 0} cities</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Trend Watch</p>
                  <p className="mt-3 text-2xl font-bold text-white">{risingCities}</p>
                  <p className="mt-1 text-sm text-slate-300">Cities with rising predicted AQI</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${status === "error" ? "bg-rose-400" : "bg-emerald-400"} shadow-[0_0_18px_currentColor]`} />
                <span>
                  {status === "loading" && "Loading live AQI feed..."}
                  {status === "ready" && "Live backend feed connected"}
                  {status === "error" && "Backend feed unavailable"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span>Last updated: {lastUpdated || "--:--"}</span>
                <button
                  type="button"
                  onClick={fetchPredictions}
                  className="rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-2 font-medium text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-400/20"
                >
                  Refresh now
                </button>
              </div>
            </div>
          </section>

          {status === "error" ? (
            <section className="mt-8 rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100 shadow-[0_20px_60px_rgba(127,29,29,0.25)]">
              <h2 className="text-2xl font-bold">Unable to load city predictions</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-100/85">
                The dashboard could not reach `{API_URL}`.
              </p>
              <p className="mt-4 rounded-2xl border border-rose-300/20 bg-slate-950/40 px-4 py-3 font-mono text-xs text-rose-100/90">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={fetchPredictions}
                className="mt-5 rounded-full border border-rose-300/30 bg-rose-400/10 px-5 py-2 font-semibold text-rose-100 transition hover:bg-rose-400/20"
              >
                Retry connection
              </button>
            </section>
          ) : null}

          {status === "loading" && cities.length === 0 ? (
            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5">
                  <div className="h-80 animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%]" />
                </div>
              ))}
            </section>
          ) : null}

          {selectedCityData ? (
            <section className={`mt-8 overflow-hidden rounded-[2rem] border ${selectedBand.border} bg-gradient-to-br ${selectedBand.surface} p-6 shadow-[0_30px_80px_rgba(2,6,23,0.45)]`}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                    Selected City Details
                  </p>
                  <h2 className="mt-4 text-3xl font-black text-white">{selectedCityData.name} air quality outlook</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Current AQI is {formatAqi(selectedCityData.currentAqi)}, with the model forecasting {formatAqi(selectedCityData.predictedAqi)} for the next interval.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${selectedBand.pill}`}>
                      {selectedBand.label}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-200">
                      Trend {selectedTrend.icon} {selectedTrend.label}
                    </span>
                  </div>
                  <p className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                    {getSuggestion(selectedCityData.currentAqi)}
                  </p>
                </div>

                <div className="grid gap-4 lg:min-w-[420px] lg:max-w-[460px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current AQI</p>
                      <p className="mt-3 text-4xl font-black text-white">{formatAqi(selectedCityData.currentAqi)}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Predicted AQI</p>
                      <p className="mt-3 text-4xl font-black text-white">{formatAqi(selectedCityData.predictedAqi)}</p>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-3 py-2">
                    <CityTrendChart
                      currentAqi={selectedCityData.currentAqi}
                      predictedAqi={selectedCityData.predictedAqi}
                      color={selectedBand.accent}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pollution Level</p>
                  <p className="mt-3 text-2xl font-bold text-white">{selectedBand.label}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trend</p>
                  <p className={`mt-3 text-2xl font-bold ${selectedTrend.tone}`}>
                    {selectedTrend.icon} {selectedTrend.label}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Most Polluted</p>
                  <p className="mt-3 text-2xl font-bold text-white">{mostPollutedCity?.name ?? "--"}</p>
                  <p className="mt-1 text-sm text-slate-300">AQI {mostPollutedCity ? formatAqi(mostPollutedCity.currentAqi) : "--"}</p>
                </div>
              </div>
            </section>
          ) : null}

          {cities.length > 0 ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-200">City Navigator</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Click any city to update the main dashboard</h2>
                </div>
                <p className="text-sm text-slate-300">All six target cities are included in the live request.</p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {cities.map((city) => {
                  const band = getAqiBand(city.currentAqi);
                  const trend = getTrend(city);
                  const isSelected = city.name === selectedCityData?.name;

                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => setSelectedCity(city.name)}
                      className={`group relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br ${band.surface} p-5 text-left shadow-[0_18px_60px_rgba(2,6,23,0.45)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_90px_rgba(2,6,23,0.6)] ${isSelected ? "border-sky-300/70 ring-2 ring-sky-300/40" : `${band.border} hover:border-white/20`}`}
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${band.glow} opacity-80 transition duration-500 group-hover:scale-110 group-hover:opacity-100`} />
                      <div className="pointer-events-none absolute -right-10 top-4 h-28 w-28 rounded-full bg-white/5 blur-2xl transition duration-500 group-hover:bg-white/10" />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">City</p>
                            <h2 className="mt-2 text-2xl font-bold text-white">{city.name}</h2>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${band.pill}`}>
                            {band.label}
                          </span>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current AQI</p>
                            <p className="mt-3 text-4xl font-black text-white">{formatAqi(city.currentAqi)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Predicted AQI</p>
                            <p className="mt-3 text-4xl font-black text-white">{formatAqi(city.predictedAqi)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trend</p>
                            <p className="mt-1 text-sm font-semibold text-white">{trend.label}</p>
                          </div>
                          <div className={`text-3xl font-black ${trend.tone}`}>{trend.icon}</div>
                        </div>

                        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/85">
                          {isSelected ? "Selected" : "Click to inspect"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {cities.length > 0 ? (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Regional Comparison</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Current vs Predicted AQI by City</h2>
                </div>
                <p className="text-sm text-slate-300">Bars show current AQI, the line shows the model forecast.</p>
              </div>
              <div className="mt-6">
                <PollutionOverviewChart cities={cities} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
