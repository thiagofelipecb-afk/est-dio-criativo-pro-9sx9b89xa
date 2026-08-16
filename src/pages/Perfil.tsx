import { Sparkles, Mail, User } from 'lucide-react'

const Perfil = () => {
  return (
    <div className="flex min-h-full items-center justify-center p-6 bg-[#0B0B10]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e15] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#7C5CFC] via-[#906BFC] to-[#22D3EE] blur-md opacity-60" />
            <img
              src="https://img.usecurling.com/ppl/large?seed=88"
              alt="Avatar do Criador"
              className="relative h-28 w-28 rounded-full object-cover ring-2 ring-white/20"
            />
          </div>

          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#7C5CFC]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#22D3EE]">
            <Sparkles className="h-3 w-3" /> Pro Criador IA
          </span>

          <h1 className="text-xl font-bold text-white">Perfil do Criador</h1>

          <div className="mt-6 w-full space-y-3 text-left">
            <div className="flex items-center gap-3 rounded-xl bg-[#14141C] px-4 py-3 border border-white/5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C5CFC]/15 text-[#7C5CFC]">
                <User className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#9494A8]">Nome</p>
                <p className="truncate text-sm font-semibold text-white">Marcos Silveira</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#14141C] px-4 py-3 border border-white/5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C5CFC]/15 text-[#7C5CFC]">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#9494A8]">E-mail</p>
                <p className="truncate text-sm font-semibold text-white">marcos@lumenstudio.io</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Perfil
