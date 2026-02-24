import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

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
      router.push('/') // Si entra bien, lo manda a la bodega
    }
    setCargando(false)
  }

  async function manejarRegistro(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) alert(error.message)
    else alert("¡Usuario creado con éxito! Ya puedes iniciar sesión.")
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Bienvenido 📦</h1>
        <p className="text-slate-500 mb-8 text-sm">StockUp</p>
        
        <form className="grid gap-4">
          <input 
            type="email" 
            placeholder="Tu correo" 
            className="p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Tu contraseña" 
            className="p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            onClick={manejarLogin}
            disabled={cargando}
            className="bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            {cargando ? 'Cargando...' : 'Entrar'}
          </button>
          <button 
            onClick={manejarRegistro}
            className="text-slate-400 text-sm hover:text-slate-600 font-medium"
          >
            No tengo cuenta, registrarme
          </button>
        </form>
      </div>
    </div>
  )
}