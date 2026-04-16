export default function StatsCard({ title, value }) {
  return (
    <div className="bg-slate-800 p-5 rounded-2xl shadow hover:scale-105 transition-transform duration-200">
      
      <p className="text-gray-400 text-sm uppercase tracking-wide">
        {title}
      </p>

      <h2 className="text-3xl font-bold mt-2 text-white">
        {value !== undefined && value !== "-" ? value : "--"}
      </h2>

    </div>
  );
}