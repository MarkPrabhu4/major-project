import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "1PM", actual: 50, predicted: 55 },
  { time: "2PM", actual: 60, predicted: 58 },
  { time: "3PM", actual: 70, predicted: 72 },
  { time: "4PM", actual: 65, predicted: 68 },
  { time: "5PM", actual: 80, predicted: 75 },
];

export default function Chart() {
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