import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  
  // UI Y CONTROL
  const [seccionActual, setSeccionActual] = useState('inventario')
  const [vistaTipo, setVistaTipo] = useState('cards') 
  const [busqueda, setBusqueda] = useState('')
  const [montado, setMontado] = useState(false)
  const [alerta, setAlerta] = useState(null)
  const [mostrarModalLegal, setMostrarModalLegal] = useState(null) // 'privacidad' o 'terminos'

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

  // --- SUBIDA DE IMÁGENES ---
  async function subirImagen(e, esNuevo) {
    const file = e.target.files?.[0]
    if (!file) return
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    dispararAlerta("Subiendo imagen...")
    const { data, error } = await supabase.storage.from('fotos_productos').upload(fileName, file)

    if (error) {
      dispararAlerta("Error al subir")
    } else {
      const { data: { publicUrl } } = supabase.storage.from('fotos_productos').getPublicUrl(fileName)
      if (esNuevo) setNuevoProd({ ...nuevoProd, foto_url: publicUrl })
      else setEditProd({ ...editProd, foto_url: publicUrl })
      dispararAlerta("Imagen lista ✅")
    }
  }

    //CERRAR SESIÓN
  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login') // Esto obliga a la app a volver al inicio
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

      {/* SIDEBAR */}
      <aside className="w-[80px] lg:w-[200px] bg-[#0f172a] text-white flex flex-col flex-shrink-0 transition-all">
        <div className="h-20 flex items-center justify-center border-b border-white/10">
          <h2 className="text-xl font-black text-blue-400 lg:block hidden tracking-tighter uppercase">StockUp</h2>
          <h2 className="text-xl font-black text-blue-400 lg:hidden block">S+</h2>
        </div>
        <nav className="flex-1 p-3 space-y-4 mt-4">
          <button onClick={() => setSeccionActual('inventario')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'inventario' ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">📦</span> <span className="text-[10px] lg:text-sm font-bold">Inventario</span>
          </button>
          <button onClick={() => setSeccionActual('historial')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'historial' ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">🕒</span> <span className="text-[10px] lg:text-sm font-bold">Historial</span>
          </button>
          <button onClick={() => setSeccionActual('config')} className={`w-full flex flex-col lg:flex-row items-center gap-2 lg:gap-3 p-3 rounded-xl transition-all ${seccionActual === 'config' ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">⚙️</span> <span className="text-[10px] lg:text-sm font-bold">Ajustes</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{seccionActual}</h1>
          {alerta && <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold animate-bounce">{alerta}</div>}
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-slate-400 hidden md:block">{usuario?.email}</p>
            <button 
  onClick={cerrarSesion} 
  className="px-4 py-1.5 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-400 hover:border-red-100 hover:text-red-500 transition-all uppercase">Salir
</button>
          </div>
        </header>

        <div className="p-6 lg:p-10 flex-1">
          {seccionActual === 'inventario' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3 text-slate-400">🔍</span>
                  <input type="text" placeholder="Buscar producto..." className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 ring-blue-500/20 shadow-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setVistaTipo(vistaTipo === 'cards' ? 'tabla' : 'cards')} className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-all shadow-sm ${vistaTipo === 'cards' ? 'bg-white border-slate-200 text-slate-400' : 'bg-blue-600 border-blue-600 text-white'}`}>
                    <span className="text-xl">{vistaTipo === 'cards' ? '👁️' : '📋'}</span>
                  </button>
                  <button onClick={() => setMostrarModalNuevo(true)} className="bg-slate-900 text-white px-8 h-14 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">+ Agregar</button>
                </div>
              </div>

              {/* VISTAS */}
              {vistaTipo === 'cards' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {filtrados.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                      <button onClick={() => { setProductoSeleccionado(p); setEditProd(p); setMostrarModalEditar(true); }} className="absolute top-2 left-2 z-10 bg-white/90 p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                      <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden border border-slate-50">
                        {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm truncate">{p.nombre}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">{p.modelo || 'S/M'}</p>
                      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-100 gap-2">
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('restar'); setMostrarModalStock(true); }} className="h-9 w-9 flex-shrink-0 bg-red-100 border border-red-200 rounded-lg text-red-600 font-black hover:bg-red-500 hover:text-white transition-all text-sm">-</button>
                        <span className={`flex-1 text-center text-lg font-black min-w-[40px] ${p.cantidad <= stockCritico ? 'text-red-500' : 'text-slate-700'}`}>{p.cantidad}</span>
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('sumar'); setMostrarModalStock(true); }} className="h-9 w-9 flex-shrink-0 bg-green-100 border border-green-200 rounded-lg text-green-700 font-black hover:bg-green-600 hover:text-white transition-all text-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                      <tr><th className="p-6">Producto</th><th className="p-6">Categoría</th><th className="p-6 text-center">Stock</th><th className="p-6 text-right">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtrados.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 flex items-center gap-4 pl-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">{p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">📦</div>}</div>
                            <div><p className="font-bold text-slate-800 truncate max-w-[150px]">{p.nombre}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{p.modelo || 'S/M'}</p></div>
                          </td>
                          <td className="p-4"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{p.categoria || 'Gral'}</span></td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-4 bg-slate-50 rounded-xl p-1 border border-slate-100 max-w-[160px] mx-auto">
                              <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('restar'); setMostrarModalStock(true); }} className="h-8 w-8 bg-red-100 text-red-600 rounded-lg font-black hover:bg-red-500 hover:text-white transition-all">-</button>
                              <span className={`text-lg font-black min-w-[30px] text-center ${p.cantidad <= stockCritico ? 'text-red-500' : 'text-slate-700'}`}>{p.cantidad}</span>
                              <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('sumar'); setMostrarModalStock(true); }} className="h-8 w-8 bg-green-100 text-green-700 rounded-lg font-black hover:bg-green-600 hover:text-white transition-all">+</button>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right"><button onClick={() => { setProductoSeleccionado(p); setEditProd(p); setMostrarModalEditar(true); }} className="text-slate-400 hover:text-blue-600 font-bold text-sm underline underline-offset-4">Editar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {seccionActual === 'historial' && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="p-4">Fecha</th><th className="p-4">Producto</th><th className="p-4">Acción</th><th className="p-4 text-center">Cant</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 text-slate-600">
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
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Configuración</h2>
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <div><p className="font-bold text-slate-700 text-sm">Stock Crítico</p><p className="text-xs text-slate-400">Notificar si queda menos de:</p></div>
                <input type="number" className="w-16 p-2 rounded-xl border-2 border-blue-100 text-center font-black outline-none focus:border-blue-500" value={stockCritico} onChange={e => setStockCritico(parseInt(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER LEGAL */}
        <footer className="border-t border-slate-200 bg-white p-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-1">StockUp</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold">matiasres@gmail.com | +56 9 4642 6808</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">La Reina, Santiago, Chile</p>
            </div>
            <div className="flex gap-6">
              <button onClick={() => setMostrarModalLegal('terminos')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Términos</button>
              <button onClick={() => setMostrarModalLegal('privacidad')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Privacidad</button>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase">© 2026 StockUp</p>
          </div>
        </footer>
      </main>

      {/* MODALES LEGALES */}
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
                Usted puede ejercer sus derechos ARCO contactando a matiasres@gmail.com.`
              ) : (
                `Al usar StockUp, usted acepta que el servicio se entrega "tal cual" para administración comercial.
                Es responsabilidad del usuario la veracidad de los datos ingresados.
                El contenido subido es propiedad del usuario, pero nos autoriza a procesarlo para el funcionamiento técnico.
                Jurisdicción aplicable: Santiago de Chile.`
              )}
            </div>
            <button onClick={() => setMostrarModalLegal(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL STOCK */}
      {mostrarModalStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-black mb-6 text-center uppercase">{tipoOperacion === 'sumar' ? 'Cargar' : 'Despachar'}</h2>
            <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-4xl font-black text-center mb-6 outline-none focus:border-blue-500" value={cantidadInput} onChange={e => setCantidadInput(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setMostrarModalStock(false)} className="flex-1 py-3 font-bold text-slate-400 text-xs">Cerrar</button>
              <button onClick={ajustarStock} className={`flex-1 py-3 rounded-xl text-white font-black text-xs ${tipoOperacion === 'sumar' ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-red-500 shadow-lg shadow-red-200'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO (NUEVO/EDITAR) */}
      {(mostrarModalNuevo || mostrarModalEditar) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={mostrarModalNuevo ? crearProducto : guardarEdicion} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95">
            <h2 className="text-2xl font-black tracking-tight uppercase">{mostrarModalNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h2>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre</label>
              <input required className="w-full bg-slate-50 p-4 rounded-xl outline-none border border-slate-100 focus:border-blue-500 font-bold" value={mostrarModalNuevo ? nuevoProd.nombre : editProd.nombre} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, nombre: e.target.value}) : setEditProd({...editProd, nombre: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Stock</label>
                <input type="number" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 focus:border-blue-500 font-bold" value={mostrarModalNuevo ? nuevoProd.cantidad : editProd.cantidad} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, cantidad: parseInt(e.target.value)}) : setEditProd({...editProd, cantidad: parseInt(e.target.value)})} />
              </div>
              <div className="w-1/2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Categoría</label>
                <input className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 focus:border-blue-500 font-bold" value={mostrarModalNuevo ? nuevoProd.categoria : editProd.categoria} onChange={e => mostrarModalNuevo ? setNuevoProd({...nuevoProd, categoria: e.target.value}) : setEditProd({...editProd, categoria: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Imagen</label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 shadow-sm">
                  {(mostrarModalNuevo ? nuevoProd.foto_url : editProd.foto_url) ? <img src={mostrarModalNuevo ? nuevoProd.foto_url : editProd.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🖼️</div>}
                </div>
                <label className="flex-1">
                  <span className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-black text-slate-600 cursor-pointer hover:bg-slate-100 transition-all inline-block shadow-sm">Subir Foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => subirImagen(e, mostrarModalNuevo)} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => {setMostrarModalNuevo(false); setMostrarModalEditar(false)}} className="flex-1 py-3 font-bold text-slate-400 text-xs">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-blue-600 transition-all">Guardar</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}