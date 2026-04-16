export default function FeatureImportance() {
  const features = [
    { name: "Temperature", value: 80, color: "bg-blue-500" },
    { name: "Humidity", value: 65, color: "bg-teal-500" },
    { name: "Wind Speed", value: 50, color: "bg-orange-400" },
    { name: "Pressure", value: 30, color: "bg-indigo-400" },
    { name: "Hour of Day", value: 20, color: "bg-gray-500" },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow text-gray-800">
      
      <h2 className="text-lg font-semibold mb-4">
        Feature Importance
      </h2>

      <div className="space-y-4">
        {features.map((f, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span>{f.name}</span>
              <span>{f.value}%</span>
            </div>

            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className={`${f.color} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${f.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}