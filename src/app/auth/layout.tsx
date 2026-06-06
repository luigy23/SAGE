import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Franja lateral decorativa con rojo institucional USCO */}
      <div className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-br from-[#8F141B] via-[#7a1017] to-[#5e0d12] px-12 lg:flex lg:w-2/5">
        {/* Brillos sutiles decorativos */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Image
            src="/Img/universidad-surcolombiana-login.png"
            alt="Universidad Surcolombiana"
            width={280}
            height={158}
            priority
            unoptimized
            className="object-contain drop-shadow-lg"
          />
          <div className="mt-8">
            <p className="text-3xl font-bold tracking-[0.3em] text-white">SAGE</p>
            <p className="mt-2 text-sm text-white/75">
              Sistema de Agenda y Gestión Educativa
            </p>
          </div>
        </div>
      </div>

      {/* Área principal del formulario */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
