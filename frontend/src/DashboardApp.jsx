import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

// Asset Imports (PNGs provided by user)
import boyGood from "./assets/boy-good.png";
import boyModerate from "./assets/boy-moderate.png";
import boyUnhealthy from "./assets/boy-unhealthy.png";
import boySevere from "./assets/boy-severe.png";

const API_URL = "http://127.0.0.1:8000/predict-all-cities";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function getAqiStatus(aqi) {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "unhealthy";
  return "severe";
}

const UI_CONFIG = {
  good: { colors: "from-[#E0F2FE] to-[#F0FDFA]", accent: "#0EA5E9", boy: boyGood, label: "Excellent" },
  moderate: { colors: "from-[#FEFCE8] to-[#F0FDF4]", accent: "#EAB308", boy: boyModerate, label: "Acceptable" },
  unhealthy: { colors: "from-[#FFF7ED] to-[#FEF2F2]", accent: "#F97316", boy: boyUnhealthy, label: "Unhealthy" },
  severe: { colors: "from-[#2E1065] to-[#020617]", accent: "#A855F7", boy: boySevere, label: "Hazardous" },
};

export default function DashboardApp() {
  const [cities, setCities] = useState([]);
  const [selectedCityName, setSelectedCityName] = useState(null);
  const [status, setStatus] = useState("loading");

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("API Down");
      const data = await res.json();
      const mapped = Object.entries(data).map(([name, vals]) => ({
        name,
        currentAqi: Math.round(vals.current_aqi),
        predictedAqi: Math.round(vals.predicted_aqi),
        temp: vals.temperature || 24,
        ...vals
      })).sort((a, b) => b.currentAqi - a.currentAqi);

      setCities(mapped);
      setStatus("ready");
      if (!selectedCityName && mapped.length > 0) {
        setSelectedCityName("Hyderabad"); // Prefer Hyderabad
      }
    } catch (err) {
      setStatus("error");
    }
  }, [selectedCityName]);

  useEffect(() => {
    fetchCities();
    const interval = setInterval(fetchCities, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCities]);

  const selectedCity = useMemo(() => 
    cities.find(c => c.name === selectedCityName) || cities[0], 
    [cities, selectedCityName]
  );

  const theme = UI_CONFIG[getAqiStatus(selectedCity?.currentAqi || 0)];

  const chartData = useMemo(() => {
    if (!selectedCity) return [];
    const now = selectedCity.currentAqi;
    const future = selectedCity.predictedAqi;
    const diff = (future - now) / 4;
    return [
      { t: 'Now', val: now },
      { t: '+1h', val: Math.round(now + diff) },
      { t: '+2h', val: Math.round(now + 2*diff) },
      { t: '+3h', val: Math.round(now + 3*diff) },
      { t: 'AI Forecast', val: future },
    ];
  }, [selectedCity]);

  if (status === "loading" && cities.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
           <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing AtmosphereIQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-screen transition-all duration-1000 bg-gradient-to-br ${theme.colors} overflow-y-auto overflow-x-hidden font-sans text-slate-900 scroll-smooth`}>
      
      {/* Premium Background Blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-[120px]" style={{ backgroundColor: theme.accent }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px] bg-sky-200"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-6 md:px-16 flex flex-col">
        
        {/* Minimal Navigation / Header */}
        <header className="py-10 flex justify-between items-center w-full">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-black/20">A</div>
              <h1 className="text-2xl font-black tracking-tighter">Atmosphere<span className="text-sky-500">IQ</span></h1>
           </div>
           <div className="px-6 py-2 bg-white/40 backdrop-blur-xl border border-white/40 rounded-full text-[10px] font-black uppercase tracking-widest hidden sm:block">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Live Nodes
           </div>
        </header>

        {/* Main Content Area - 4-Column Quarter Layout */}
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-10">
           
           {/* Q1: City & Character */}
           <div className="flex flex-col justify-center animate-in fade-in slide-in-from-left duration-700">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Location</span>
              <h2 className="text-6xl font-black tracking-tighter leading-none mb-8">{selectedCity?.name}</h2>
              <div className="relative">
                 <div className="absolute inset-x-0 bottom-0 h-4 w-full bg-black/5 blur-xl rounded-full"></div>
                 <img key={selectedCity?.name} src={theme.boy} alt="Character" className="w-full max-w-[200px] object-contain relative z-10 animate-in zoom-in duration-700 mx-auto lg:mx-0" />
              </div>
           </div>

           {/* Q2: Current & Future AQI */}
           <div className="flex flex-col justify-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="p-8 rounded-[2.5rem] bg-white/30 backdrop-blur-lg border border-white/40 shadow-sm text-center lg:text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Stability</p>
                 <p className="text-7xl font-black leading-none mb-2">{selectedCity?.currentAqi}</p>
                 <span className="px-3 py-1 rounded-full bg-black/5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                    {theme.label} Air
                 </span>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-white/20 backdrop-blur-md border border-white/30 shadow-sm text-center lg:text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Forecasting</p>
                 <p className="text-5xl font-black leading-none text-sky-600">{selectedCity?.predictedAqi}</p>
                 <p className="text-[10px] font-bold mt-2 text-slate-400 uppercase tracking-widest">Predicted AQI</p>
              </div>
           </div>

           {/* Q3: Pollutants & Temperature */}
           <div className="flex flex-col justify-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              {[
                { l: 'Temperature', v: selectedCity?.temp, u: '°C' },
                { l: 'PM 2.5', v: Math.round(selectedCity?.pm2_5), u: 'µg/m³' },
                { l: 'PM 10', v: Math.round(selectedCity?.pm10), u: 'µg/m³' },
                { l: 'NO₂ Level', v: Math.round(selectedCity?.no2), u: 'µg/m³' },
              ].map(item => (
                <div key={item.l} className="p-6 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex justify-between items-center group hover:bg-white/40 transition-colors">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.l}</p>
                   <p className="text-2xl font-black">{item.v}<span className="text-[10px] font-bold ml-1 text-slate-400">{item.u}</span></p>
                </div>
              ))}
           </div>

           {/* Q4: Graph Dynamics */}
           <div className="flex flex-col justify-center animate-in fade-in slide-in-from-right duration-700">
              <div className="bg-white/30 backdrop-blur-2xl border border-white/50 rounded-[3rem] p-8 shadow-2xl overflow-hidden relative group h-full flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Trajectory</h3>
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-400"></div>
                 </div>

                 <div className="flex-1 min-h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={theme.accent} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                          <XAxis dataKey="t" hide />
                          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                          <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke={theme.accent} 
                            strokeWidth={5} 
                            fill="url(#areaGrad)" 
                            dot={{ r: 4, fill: theme.accent, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                          />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="mt-6 flex justify-between border-t border-black/5 pt-6 overflow-x-auto no-scrollbar">
                    {chartData.map(d => (
                       <div key={d.t} className="text-center px-2">
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">{d.t}</p>
                          <p className="text-xs font-black">{d.val}</p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </main>

        {/* Horizontal Scroll Selector - Interactive */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-10">
           {cities.map(city => (
             <button
              key={city.name}
              onClick={() => {
                  setSelectedCityName(city.name);
                  console.log("SELECTING CITY:", city.name);
              }}
              className={`flex-shrink-0 w-44 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between border ${city.name === selectedCityName ? 'bg-black text-white border-black scale-105 shadow-xl' : 'bg-white/40 border-white hover:bg-white/60'}`}
             >
               <p className="text-xs font-black uppercase tracking-widest opacity-40">Region</p>
               <p className="text-lg font-black tracking-tight">{city.name}</p>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
}
