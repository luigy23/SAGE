export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Franja lateral decorativa con rojo institucional USCO */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#8F141B] relative overflow-hidden flex-col items-center justify-center px-12 text-white">
        {/* Patrón decorativo sutil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10 text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">SAGE</h1>
          <div className="w-16 h-1 bg-white/60 mx-auto rounded-full" />
  
          <p className="text-sm text-white/50 mt-8">
            Universidad Surcolombiana
          </p>
        </div>
      </div>

      {/* Área principal del formulario */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
