export default function Layout({ sidebar, children, header }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#00335B] text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#F0AB00] rounded flex items-center justify-center font-bold text-[#00335B] text-xs">QDI</div>
          <span className="font-bold text-sm tracking-wide">TechSambad QDI</span>
          <span className="text-[10px] text-blue-200 bg-blue-800/40 px-2 py-0.5 rounded-full">Qualitative Data Intelligence</span>
        </div>
        <div className="flex-1">{header}</div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-[#00335B] text-white flex flex-col flex-shrink-0 overflow-y-auto">
          {sidebar}
        </div>
        {/* Main */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}
