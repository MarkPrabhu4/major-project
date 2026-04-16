export default function WeatherCard() {
  const weatherData = [
    { label: "Temperature", value: "26°C" },
    { label: "Humidity", value: "65%" },
    { label: "Wind Speed", value: "4.8 m/s" },
    { label: "Pressure", value: "1012 hPa" },
    { label: "Visibility", value: "3.8 km" },
    { label: "Dew Point", value: "5.5 km" }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow text-gray-800">
      
      <h2 className="text-lg font-semibold mb-4">
        Current Weather Data
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {weatherData.map((item, index) => (
          <div
            key={index}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 rounded-lg shadow hover:scale-105 transition-transform duration-200"
          >
            <p className="text-sm opacity-80">{item.label}</p>
            <p className="text-xl font-bold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}