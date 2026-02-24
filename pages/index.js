import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  
  // UI Y SECCIONES
  const [seccionActual, setSeccionActual] = useState('inventario')
  const [sidebarAbierto, setSidebarAbierto] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [imagenZoom, setImagenZoom] = useState(null)

  // ESTADO PARA NOTIFICACIONES PERSONALIZADAS (UX/UI)
  const [alertaPersonalizada, setAlertaPersonalizada] = useState(null)

  // DATOS
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [usuario, setUsuario] = useState(null)

  // CONFIGURACIÓN
  const [stockCritico, setStockCritico] = useState(5)

  // ESTADOS MODALES
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false)
  const [mostrarModalStock, setMostrarModalStock] = useState(false)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [tipoOperacion, setTipoOperacion] = useState('') 
  const [cantidadInput, setCantidadInput] = useState('')

  // FORMULARIOS
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' })
  const [editProd, setEditProd] = useState({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' })

  useEffect(() => {
    const chequeoUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login') } else {
        setUsuario(session.user)
        obtenerProductos(); obtenerMovimientos();
      }
    }
    chequeoUsuario()
  }, [])

  async function obtenerProductos() {
    const { data } = await supabase.from('productos').select('*').order('nombre', { ascending: true })
    setProductos(data || [])
  }

  async function obtenerMovimientos() {
    const { data } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false }).limit(50)
    setMovimientos(data || [])
  }

  // Punto 3: Lógica de notificación con diseño UX/UI
  const dispararNotificacion = (msg, tipo) => {
    setAlertaPersonalizada({ mensaje: msg, tipo: tipo })
    // Se quita sola después de 4 segundos
    setTimeout(() => setAlertaPersonalizada(null), 4000)
  }
  // 1. Añade esta función arriba de "confirmarAjusteStock"
const enviarWhatsApp = async (mensaje) => {
  const tkn = "EAAMNe1rjVWEBQ6ZATcSxvzKiM03CKM3efN3VgI5aLxXbLh6ZBnkKMQ7TzCZB6BxckM6D9ZCUfNYqgkfXgaTbvrrRT3DUJi2J1d4RaBbmHLH9siwWcKzIbCfscU2OhmHiezNK4sLsBO3Rq7m2sGUAgaJGQrqChIzg0hj9KQaVf9FKKNs62hGp8nCdJDZAG"; // Asegúrate que sea el mismo que pegaste antes
  const phoneId = "996700506860030";
  const miNumero = "56946426808"; // Tu número real sin el +

  console.log("Intentando enviar a:", miNumero); // Esto nos dirá en la consola a qué número apunta

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tkn}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: miNumero,
        type: "template",
        template: { 
          name: "hello_world", 
          language: { code: "en_us" } 
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Detalle del error de Meta:", data); // ¡Esto nos dirá EXACTAMENTE qué no le gusta a Meta!
    } else {
      console.log("¡Mensaje enviado con éxito!", data);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

// 2. Modifica la función verificarAlerta que ya tenías
const verificarAlerta = (producto, nuevaCant) => {
  let msg = "";
  if (nuevaCant === 0) {
    msg = `🚨 ¡URGENTE! El producto "${producto.nombre}" se ha agotado por completo.`;
  } else if (nuevaCant <= stockCritico) {
    msg = `⚠️ ATENCIÓN: El stock de "${producto.nombre}" está bajo (${nuevaCant} unidades restantes).`;
  }

  if (msg) {
    // Esto muestra la alerta en la web (lo que ya teníamos)
    dispararNotificacion(msg, nuevaCant === 0 ? 'error' : 'warning');
    
    // NUEVO: Esto envía el mensaje real a tu celular
    enviarWhatsApp(msg);
  }
}
  async function confirmarAjusteStock() {
    const cant = parseInt(cantidadInput)
    if (isNaN(cant) || cant <= 0) return alert("Cantidad inválida")
    let nuevaCantidad = tipoOperacion === 'sumar' ? productoSeleccionado.cantidad + cant : productoSeleccionado.cantidad - cant
    if (nuevaCantidad < 0) return alert("No hay stock suficiente")

    const { error } = await supabase.from('productos').update({ cantidad: nuevaCantidad }).eq('id', productoSeleccionado.id)
    
    if (!error) {
      await supabase.from('movimientos').insert([{
        producto_id: productoSeleccionado.id,
        producto_nombre: productoSeleccionado.nombre,
        cantidad: tipoOperacion === 'sumar' ? cant : -cant,
        usuario_email: usuario.email,
        tipo_operacion: tipoOperacion === 'sumar' ? 'AGREGÓ' : 'SACÓ'
      }])

      // Punto 3: Alertas con diseño
      if (nuevaCantidad === 0) {
        dispararNotificacion(`🚨 ¡URGENTE! "${productoSeleccionado.nombre}" se agotó.`, 'error')
      } else if (nuevaCantidad <= stockCritico) {
        dispararNotificacion(`⚠️ STOCK BAJO: "${productoSeleccionado.nombre}" tiene ${nuevaCantidad} unidades.`, 'warning')
      } else {
        dispararNotificacion(`✅ Stock actualizado correctamente.`, 'success')
      }

      setMostrarModalStock(false); setCantidadInput(''); obtenerProductos(); obtenerMovimientos();
    }
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    const { error } = await supabase.from('productos').update(editProd).eq('id', productoSeleccionado.id)
    if (!error) { setMostrarModalEditar(false); obtenerProductos(); dispararNotificacion("Producto actualizado", "success"); }
  }

  async function crearProducto(e) {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([nuevoProd])
    if (!error) { 
      setMostrarModalNuevo(false); 
      setNuevoProd({ nombre: '', modelo: '', cantidad: 0, foto_url: '', categoria: '' }); 
      obtenerProductos();
      dispararNotificacion("Producto creado con éxito", "success");
    }
  }

  const productosFiltrados = productos.filter(p => 
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <Head><title>StockUp | Panel</title></Head>

      {/* NOTIFICACIÓN FLOTANTE (UX/UI) */}
      {alertaPersonalizada && (
        <div className={`fixed top-5 right-5 z-[100] p-4 rounded-2xl shadow-2xl border-l-4 flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
          alertaPersonalizada.tipo === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 
          alertaPersonalizada.tipo === 'warning' ? 'bg-orange-50 border-orange-400 text-orange-800' : 
          'bg-green-50 border-green-400 text-green-800'
        }`}>
          <span className="text-xl">{alertaPersonalizada.tipo === 'error' ? '🚫' : alertaPersonalizada.tipo === 'warning' ? '⚠️' : '✅'}</span>
          <p className="font-bold text-sm">{alertaPersonalizada.mensaje}</p>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`${sidebarAbierto ? 'w-64' : 'w-20'} bg-[#0f172a] transition-all duration-300 flex flex-col text-white fixed h-full z-20`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          {sidebarAbierto && <span className="font-black text-xl tracking-tighter text-blue-400">StockUp</span>}
          <button onClick={() => setSidebarAbierto(!sidebarAbierto)} className="hover:bg-slate-800 p-2 rounded-lg">☰</button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setSeccionActual('inventario')} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${seccionActual === 'inventario' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">📦</span> {sidebarAbierto && <span className="font-bold">Inventario</span>}
          </button>
          <button onClick={() => setSeccionActual('historial')} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${seccionActual === 'historial' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">🕒</span> {sidebarAbierto && <span className="font-bold">Historial</span>}
          </button>
          {/* Punto 2: Botón de notificaciones con color igual a los demás */}
          <button onClick={() => setSeccionActual('notificaciones')} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${seccionActual === 'notificaciones' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <span className="text-xl">🔔</span> {sidebarAbierto && <span className="font-bold">Notificaciones</span>}
          </button>
        </nav>
      </aside>

      {/* CONTENIDO */}
      <main className={`flex-1 ${sidebarAbierto ? 'ml-64' : 'ml-20'} p-6 transition-all`}>
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{seccionActual}</h2>
          <p className="text-slate-400 text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">{usuario?.email}</p>
        </header>

        {seccionActual === 'inventario' && (
          <>
            <div className="flex justify-between mb-4">
              <input type="text" placeholder="Buscar..." className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-72 text-sm shadow-sm outline-none focus:border-blue-400" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <button onClick={() => setMostrarModalNuevo(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all">+ Agregar</button>
            </div>
            {/* Tabla sin bordes negros, fondo blanco limpio */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                  <tr><th className="px-5 py-3">Producto</th><th className="px-5 py-3 text-center">Stock</th><th className="px-5 py-3 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {productosFiltrados.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 flex items-center gap-4">
                        <div onClick={() => p.foto_url && setImagenZoom(p.foto_url)} className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden cursor-pointer border border-slate-100">
                          {p.foto_url ? <img src={p.foto_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs">📦</div>}
                        </div>
                        <div>
                          {/* Punto 1: Color rojo más claro (text-red-400) */}
                          <p className={`font-bold ${p.cantidad <= stockCritico ? 'text-red-400' : 'text-slate-700'}`}>{p.nombre}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{p.categoria || 'Sin Categoría'}</p>
                        </div>
                      </td>
                      {/* Punto 1: Cantidad también en rojo más claro */}
                      <td className={`px-5 py-3 text-center font-black text-lg ${p.cantidad <= stockCritico ? 'text-red-400' : 'text-slate-600'}`}>
                        {p.cantidad}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('sumar'); setMostrarModalStock(true); }} className="w-8 h-8 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all">+</button>
                        <button onClick={() => { setProductoSeleccionado(p); setTipoOperacion('restar'); setMostrarModalStock(true); }} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all">-</button>
                        <button onClick={() => { setProductoSeleccionado(p); setEditProd(p); setMostrarModalEditar(true); }} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg text-xs">✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {seccionActual === 'notificaciones' && (
          <div className="max-w-md bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">Preferencias de Stock</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm">Stock Mínimo</p>
                <p className="text-xs text-slate-400 font-medium">Alertar al llegar a:</p>
              </div>
              <input 
                type="number" 
                className="w-20 p-3 rounded-xl border-2 border-blue-100 font-black text-center outline-none focus:border-blue-500 transition-all" 
                value={stockCritico} 
                onChange={(e) => setStockCritico(parseInt(e.target.value))} 
              />
            </div>
          </div>
        )}

        {seccionActual === 'historial' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                <tr><th className="p-5">Fecha</th><th className="p-5">Acción</th><th className="p-5">Producto</th><th className="p-5 text-center">Cant.</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="p-5 text-xs text-slate-500 font-medium">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="p-5"><span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${m.tipo_operacion === 'AGREGÓ' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.tipo_operacion}</span></td>
                    <td className="p-5 font-bold text-slate-700">{m.producto_nombre}</td>
                    <td className="p-5 text-center font-black text-slate-600">{m.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL ZOOM */}
      {imagenZoom && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 cursor-zoom-out" onClick={() => setImagenZoom(null)}>
          <img src={imagenZoom} className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl animate-in zoom-in-95" />
        </div>
      )}

      {/* MODAL AJUSTE STOCK */}
      {mostrarModalStock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-1 tracking-tight">{tipoOperacion === 'sumar' ? '🚀 Cargar Stock' : '📉 Despachar'}</h2>
            <p className="text-slate-400 text-sm mb-6 font-medium">{productoSeleccionado?.nombre}</p>
            <input autoFocus type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-3xl font-black mb-6 outline-none focus:border-blue-500" value={cantidadInput} onChange={(e) => setCantidadInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && confirmarAjusteStock()} />
            <div className="flex gap-3">
              <button onClick={() => setMostrarModalStock(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
              <button onClick={confirmarAjusteStock} className={`flex-1 py-3 rounded-2xl text-white font-black shadow-lg shadow-current/20 ${tipoOperacion === 'sumar' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES NUEVO/EDITAR */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={crearProducto} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-2xl font-black tracking-tight">Nuevo Producto</h2>
            <div className="space-y-3">
              <input required placeholder="Nombre del ítem" className="w-full border-slate-100 border p-3 rounded-xl outline-none focus:border-blue-400" onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <div className="flex gap-3">
                <input required type="number" placeholder="Stock" className="flex-1 border-slate-100 border p-3 rounded-xl outline-none focus:border-blue-400" onChange={e => setNuevoProd({...nuevoProd, cantidad: parseInt(e.target.value)})} />
                <input placeholder="Categoría" className="flex-1 border-slate-100 border p-3 rounded-xl outline-none focus:border-blue-400" onChange={e => setNuevoProd({...nuevoProd, categoria: e.target.value})} />
              </div>
              <input placeholder="URL Foto" className="w-full border-slate-100 border p-3 rounded-xl outline-none focus:border-blue-400" onChange={e => setNuevoProd({...nuevoProd, foto_url: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setMostrarModalNuevo(false)} className="flex-1 font-bold text-slate-400">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black shadow-lg shadow-blue-500/30">Crear</button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}