import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Chart from "./components/Chart";
import WeatherCard from "./components/WeatherCard";
import FeatureImportance from "./components/FeatureImportance";

export default function App() {
  const [metrics, setMetrics] = useState({
    mae: "-",
    rmse: "-",
    smape: "-"
  });

  const [pmValue, setPmValue] = useState("-");
  const [data, setData] = useState([]);

  const API_BASE = "https://aqi-backend-xlo9.onrender.com";
  useEffect(() => {
    fetch(`${API_BASE}/predict`)
      .then(res => res.json())
      .then(res => {
        setMetrics(res.metrics);
        setData(res.data);

        const last = res.data[res.data.length - 1];
        setPmValue(last.predicted.toFixed(1));
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 p-6">

      {/* NAVBAR */}
      <Navbar />

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        {/* LEFT SIDE */}
        <div className="space-y-6">

          {/* PM2.5 FORECAST */}
          <div className="bg-white p-6 rounded-2xl shadow text-gray-800">
            <h2 className="text-xl font-semibold mb-4">
              PM2.5 Forecast
            </h2>

            <p className="text-gray-500">
              Predicted PM2.5 Level for the Next Hour
            </p>

            <h1 className="text-6xl font-bold text-blue-900 mt-2">
              {pmValue} µg/m³
            </h1>

            <p className="mt-3 bg-gray-200 inline-block px-3 py-1 rounded">
              Moderate Air Quality
            </p>

            {/* METRICS */}
            <div className="flex gap-4 mt-6">
              <div className="bg-orange-400 text-white px-4 py-2 rounded-lg">
                MAE {metrics.mae}
              </div>
              <div className="bg-pink-500 text-white px-4 py-2 rounded-lg">
                RMSE {metrics.rmse}
              </div>
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg">
                SMAPE {metrics.smape}%
              </div>
            </div>
          </div>

          {/* WEATHER */}
          <WeatherCard />

        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">

          {/* CHART */}
          <Chart data={data} />

          {/* FEATURE IMPORTANCE */}
          <FeatureImportance />

        </div>

      </div>

      {/* BOTTOM CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center mt-6">

        <div className="flex gap-4">
          <select className="p-2 border rounded">
            <option>24 Hours</option>
            <option>48 Hours</option>
          </select>

          <select className="p-2 border rounded">
            <option>Beijing</option>
          </select>
        </div>

        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Predict
        </button>
      </div>

    </div>
  );
}