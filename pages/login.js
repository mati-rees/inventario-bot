import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarModalLegal, setMostrarModalLegal] = useState(null) // 'privacidad' o 'terminos'
  const router = useRouter()

  async function manejarLogin(e) {
    e.preventDefault()
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Error: " + error.message)
    else router.push('/')
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* 1. HEADER DE MARCA */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-1">StockUp</h1>
        <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">
          Gestión de inventarios automatizado
        </p>
      </div>

      {/* 2. TARJETA DE LOGIN */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 max-w-sm w-full z-10">
        <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center justify-center gap-2">
          Ingresa 📦
        </h2>

        <form className="grid gap-4" onSubmit={manejarLogin}>
          <input 
            type="email" 
            placeholder="Tu correo" 
            className="p-4 border-2 border-slate-50 bg-slate-50/50 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Tu contraseña" 
            className="p-4 border-2 border-slate-50 bg-slate-50/50 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            disabled={cargando}
            className={`text-white p-4 rounded-2xl font-black text-lg shadow-lg transition-all mt-2 ${cargando ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
          >
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* 3. FOOTER CON ENLACES (ESTO ES LO QUE ACTIVARÁ EL MODAL) */}
      <footer className="mt-8 flex flex-col items-center gap-4">
        <div className="flex gap-6">
          <button 
            onClick={() => setMostrarModalLegal('terminos')} 
            className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
          >
            Términos
          </button>
          <button 
            onClick={() => setMostrarModalLegal('privacidad')} 
            className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
          >
            Privacidad
          </button>
        </div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter text-center">
          © 2026 StockUp - Carlos Ossandon 1691, La Reina
        </p>
      </footer>

      {/* 4. MODAL LEGAL (EL QUE SE DESPLIEGA) */}
      {mostrarModalLegal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {mostrarModalLegal === 'terminos' ? 'Términos y Condiciones' : 'Políticas de Privacidad'}
            </h2>
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
              {mostrarModalLegal === 'privacidad' ? (
                `StockUp (matiasres@gmail.com), Carlos Ossandon 1691, La Reina, es responsable del tratamiento de sus datos personales.
                Recolectamos información necesaria para la gestión de inventarios: correos, nombres de productos y logs.
                Finalidad: Proveer el servicio y cumplir con los requisitos de verificación de Meta para WhatsApp Business.
                Usted puede ejercer sus derechos ARCO contactando a matiasres@gmail.com al +56 9 4642 6808.`
              ) : (
                `Al usar StockUp, usted acepta que el servicio se entrega "tal cual" para administración comercial.
                Es responsabilidad del usuario la veracidad de los datos ingresados.
                El contenido subido es propiedad del usuario, pero nos autoriza a procesarlo para el funcionamiento técnico.
                Jurisdicción aplicable: Santiago de Chile. Contacto: Carlos Ossandon 1691, La Reina.`
              )}
            </div>
            <button 
              onClick={() => setMostrarModalLegal(null)} 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}