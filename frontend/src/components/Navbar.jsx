export default function Navbar() {
  return (
    <div className="bg-blue-900 text-white p-4 rounded-xl shadow flex justify-between items-center">
      <h1 className="text-xl font-bold">Air Pollution Forecasting System</h1>

      <div className="space-x-6 text-sm">
        <span className="border-b-2 border-cyan-400 pb-1 cursor-pointer">Home</span>
        <span className="cursor-pointer">Data Analysis</span>
        <span className="cursor-pointer">Model Training</span>
        <span className="cursor-pointer">About</span>
      </div>
    </div>
  );
}