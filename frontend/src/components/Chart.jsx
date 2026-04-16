import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { useEffect, useState } from "react";

export default function Chart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/predict")
      .then(res => res.json())
      .then(res => setData(res.data));
  }, []);

  return (
    <div className="bg-slate-800 p-6 rounded-2xl shadow">
      <h2 className="text-lg font-semibold mb-4">
        Actual vs Predicted
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="actual" stroke="#38bdf8" />
          <Line type="monotone" dataKey="predicted" stroke="#f97316" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}