import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  // Sincronizamos el nombre a "manejarLogin"
  async function manejarLogin(e) {
    e.preventDefault()
    setCargando(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      router.push('/') 
    }
    setCargando(false)
  }

  async function manejarRegistro() {
    if (!email || !password) return alert("Rellena los campos primero");
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) alert(error.message)
    else alert("¡Usuario creado con éxito! Ya puedes iniciar sesión.")
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* HEADER DE MARCA */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-1">
          StockUp
        </h1>
        <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">
          Gestión de inventarios automatizado
        </p>
      </div>

      {/* TARJETA DE LOGIN */}
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 max-w-sm w-full">
        <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center justify-center gap-2">
          Ingresa 📦
        </h2>

        {/* Usamos manejarLogin aquí también */}
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

        <p className="text-center mt-8 text-slate-400 font-bold text-sm">
          No tengo cuenta, <span onClick={manejarRegistro} className="text-blue-600 cursor-pointer hover:underline">registrarme</span>
        </p>
      </div>

      {/* FOOTER PEQUEÑO PARA META */}
      <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Al entrar aceptas nuestras políticas de privacidad
      </p>
    </div>
  )
}