import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  
  // UI Y CONTROL
  const [seccionActual, setSeccionActual] = useState('inventario')
  const [busqueda, setBusqueda] = useState('')
  const [montado, setMontado] = useState(false)
  const [alerta, setAlerta] = useState(null)

  // DATOS
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [usuario, setUsuario] = useState(null)
  const [stockCritico, setStockCritico] = useState(5)

  // MODALES
  const [mostrarModalStock, setMostrarModalStock] = useState(false)
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [tipoOperacion, setTipoOperacion] = useState('') 
  const [cantidadInput, setCantidadInput] = useState('')

  // FORMULARIOS
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' })
  const [editProd, setEditProd] = useState({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' })

  useEffect(() => {
    const inicializar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { 
        router.push('/login') 
      } else {
        setUsuario(session.user)
        obtenerDatos()
      }
      setMontado(true)
    }
    inicializar()
  }, [])

  async function obtenerDatos() {
    const { data: p } = await supabase.from('productos').select('*').order('nombre')
    const { data: m } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false }).limit(20)
    setProductos(p || [])
    setMovimientos(m || [])
  }

  const dispararAlerta = (msg) => {
    setAlerta(msg); setTimeout(() => setAlerta(null), 3000);
  }

  // --- FUNCIONES CORE ---
  async function ajustarStock() {
    const cant = parseInt(cantidadInput)
    if (isNaN(cant) || cant <= 0) return
    const nuevaCant = tipoOperacion === 'sumar' ? productoSeleccionado.cantidad + cant : productoSeleccionado.cantidad - cant
    if (nuevaCant < 0) return alert("No hay stock suficiente")

    const { error } = await supabase.from('productos').update({ cantidad: nuevaCant }).eq('id', productoSeleccionado.id)
    if (!error) {
      await supabase.from('movimientos').insert([{
        producto_nombre: productoSeleccionado.nombre,
        cantidad: tipoOperacion === 'sumar' ? cant : -cant,
        tipo_operacion: tipoOperacion === 'sumar' ? 'ENTRADA' : 'SALIDA'
      }])
      setMostrarModalStock(false); setCantidadInput(''); obtenerDatos(); dispararAlerta("Stock actualizado");
    }
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    const { error } = await supabase.from('productos').update(editProd).eq('id', productoSeleccionado.id)
    if (!error) { setMostrarModalEditar(false); obtenerDatos(); dispararAlerta("Producto editado"); }
  }

  async function crearProducto(e) {
    e.preventDefault()
    const { error } = await supabase.from('productos').insert([nuevoProd])
    if (!error) { setMostrarModalNuevo(false); setNuevoProd({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' }); obtenerDatos(); dispararAlerta("Producto creado"); }
  }

  const filtrados = productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()))

  if (!montado) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex overflow-hidden font-sans">
      <Head><title>StockUp | Admin</title></Head>

      {/* 1. SIDEBAR SLIM (Espacio optimizado) */}
      <aside className="w-[80px] lg:w-[200px] bg-[#0f172a] text-white flex flex-col flex-shrink-0 transition-all">
        <div className="h-20 flex items-center justify-center border-b border-white/10">
          <h2 className="text-xl font-black text-blue-400 lg:block hidden">StockUp</h2>
          <h2 className="text-xl font-black text-blue-400 lg:hidden block">S+</h2>
        </div>
        <nav className="flex-1 p-3 space-y-4 mt-4">
          <button onClick={() => setSeccionActual('inventario')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'inventario' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">📦</span> <span className="text-[10px] lg:text-sm font-bold">Inventario</span>
          </button>
          <button onClick={() => setSeccionActual('historial')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'historial' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">🕒</span> <span className="text-[10px] lg:text-sm font-bold">Historial</span>
          </button>
          <button onClick={() => setSeccionActual('config')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'config' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">⚙️</span> <span className="text-[10px] lg:text-sm font-bold">Ajustes</span>
          </button>
        </nav>
      </aside>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Header fijo */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{seccionActual}</h1>
          {alerta && <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold animate-bounce">{alerta}</div>}
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-slate-500 hidden md:block">{usuario?.email}</p>
            <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-red-500 hover:underline">Salir</button>
          </div>
        </header>

        <div className="p-6 lg:p-10">
          {seccionActual === 'inventario' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3 text-slate-400">🔍</span>
                  <input type="text" placeholder="Buscar producto..." className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 ring-blue-500/20 shadow-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <button onClick={() => setMostrarModalNuevo(true)} className="bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">+ Agregar</button>
              </div>

              {/* GRID DE CARDS COMPACTAS */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filtrados.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                    <button onClick={() => { setProductoSeleccionado(p); setEditProd(p); setMostrarModalEditar(true); }} className="absolute top-2 left-2 z-10 bg-white/90 p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                    
                    <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden border border-slate-50">
                      {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-sm truncate">{p.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">{p.modelo || 'S/M'}</p>
                    
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                      <span className={`text-lg font-black ${p.cantidad <= stockCritico ? 'text-red-500' : 'text-slate-700'}`}>{p.cantidad}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('restar'); setMostrarModalStock(true); }} className="w-7 h-7 bg-white border rounded-md text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all text-xs">-</button>
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('sumar'); setMostrarModalStock(true); }} className="w-7 h-7 bg-white border rounded-md text-green-600 font-bold hover:bg-green-600 hover:text-white transition-all text-xs">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seccionActual === 'historial' && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="p-4">Fecha</th><th className="p-4">Producto</th><th className="p-4">Acción</th><th className="p-4 text-center">Cant</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-4 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="p-4 font-bold">{m.producto_nombre}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${m.tipo_operacion === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.tipo_operacion}</span></td>
                      <td className="p-4 text-center font-black">{m.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {seccionActual === 'config' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200">
              <h2 className="text-xl font-black mb-6">Configuración de Bodega</h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700">Stock Crítico</p>
                    <p className="text-xs text-slate-400">Avisar cuando quede menos de:</p>
                  </div>
                  <input type="number" className="w-16 p-2 rounded-xl border-2 border-blue-100 text-center font-black" value={stockCritico} onChange={e => setStockCritico(parseInt(e.target.value))} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALES --- */}

      {/* Ajuste Stock */}
      {mostrarModalStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-center">{tipoOperacion === 'sumar' ? '🚀 Cargar' : '📉 Despachar'}</h2>
            <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-4xl font-black text-center mb-6 outline-none focus:border-blue-500" value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setMostrarModalStock(false)} className="flex-1 py-3 font-bold text-slate-400">Cerrar</button>
              <button onClick={ajustarStock} className={`flex-1 py-3 rounded-xl text-white font-black shadow-lg ${tipoOperacion === 'sumar' ? 'bg-green-500' : 'bg-red-500'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo / Editar */}
      {(mostrarModalNuevo || mostrarModalEditar) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={mostrarModalNuevo ? crearProducto : guardarEdicion} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-2xl font-black mb-4">{mostrarModalNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h2>
            <input required placeholder="Nombre" className="w-full bg-slate-50 p-4 rounded-xl outline-none border border-slate-100" value={mostrarModalNuevo ? nuevoProd.nombre : editProd.nombre} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, nombre: e.target.value}) : setEditProd({...editProd, nombre: e.target.value})} />
            <div className="flex gap-4">
              <input type="number" placeholder="Cantidad" className="w-1/2 bg-slate-50 p-4 rounded-xl border border-slate-100" value={mostrarModalNuevo ? nuevoProd.cantidad : editProd.cantidad} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, cantidad: parseInt(e.target.value)}) : setEditProd({...editProd, cantidad: parseInt(e.target.value)})} />
              <input placeholder="Categoría" className="w-1/2 bg-slate-50 p-4 rounded-xl border border-slate-100" value={mostrarModalNuevo ? nuevoProd.categoria : editProd.categoria} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, categoria: e.target.value}) : setEditProd({...editProd, categoria: e.target.value})} />
            </div>
            <input placeholder="URL Foto" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100" value={mostrarModalNuevo ? nuevoProd.foto_url : editProd.foto_url} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, foto_url: e.target.value}) : setEditProd({...editProd, foto_url: e.target.value})} />
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => {setMostrarModalNuevo(false); setMostrarModalEditar(false)}} className="flex-1 py-3 font-bold text-slate-400 text-sm">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-sm">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}