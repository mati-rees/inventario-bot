import { supabase } from '../../lib/supabase';

// --- CONFIGURACIÓN DE STOCKUP ---
const MI_TOKEN_META = "MatiBodega2026";
const META_ACCESS_TOKEN = "EAAMNe1rjVWEBQ6ZATcSxvzKiM03CKM3efN3VgI5aLxXbLh6ZBnkKMQ7TzCZB6BxckM6D9ZCUfNYqgkfXgaTbvrrRT3DUJi2J1d4RaBbmHLH9siwWcKzIbCfscU2OhmHiezNK4sLsBO3Rq7m2sGUAgaJGQrqChIzg0hj9KQaVf9FKKNs62hGp8nCdJDZAG"; // REEMPLAZA ESTO
const PHONE_NUMBER_ID = "996700506860030"; // REEMPLAZA ESTO

// Función auxiliar para enviar mensajes (La "Voz" del bot)
async function enviarWhatsApp(to, texto) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: texto }
      })
    });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err);
  }
}

export default async function handler(req, res) {
  console.log("---------------------------------------");
  console.log("🔥 SOLICITUD RECIBIDA:", req.method);
  console.log("---------------------------------------");
  // 1. VALIDACIÓN PARA META
  if (req.method === 'GET') {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Ponemos el token directamente entre comillas
    if (token === "MatiBodega2026") {
      return res.status(200).send(challenge);
    }
    
    return res.status(403).send("Error de token");
  }

  // 2. RECEPCIÓN DE MENSAJES
  if (req.method === 'POST') {
    console.log("📦 BODY RECIBIDO:", JSON.stringify(req.body, null, 2));

    const body = req.body;
    const mensaje = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (mensaje) {
      const textoOriginal = mensaje.text.body;
      const texto = textoOriginal.toLowerCase().trim();
      const numeroCliente = mensaje.from;

      // --- FLUJO A: ¿EL USUARIO ESTÁ ELIGIENDO UN NÚMERO? ---
      const { data: sesion } = await supabase
        .from('sesiones_bot')
        .select('*')
        .eq('numero_whatsapp', numeroCliente)
        .eq('esperando_seleccion', true)
        .single();

      if (sesion && !isNaN(texto)) {
        const indice = parseInt(texto) - 1;
        const productoElegido = sesion.opciones[indice];

        if (productoElegido) {
          const cantidadCambio = parseInt(sesion.cantidad);
          const nuevoStock = sesion.accion === 'quitar' 
            ? productoElegido.cantidad - cantidadCambio 
            : productoElegido.cantidad + cantidadCambio;

          // Actualizar Stock
          await supabase.from('productos').update({ cantidad: nuevoStock }).eq('id', productoElegido.id);
          // Borrar sesión
          await supabase.from('sesiones_bot').delete().eq('id', sesion.id);
          
          await enviarWhatsApp(numeroCliente, `✅ *StockUp Actualizado*\n\nSe ha ${sesion.accion}do ${cantidadCambio} unidades a *${productoElegido.nombre}*.\n📦 *Stock final: ${nuevoStock}*`);
          return res.status(200).send('OK');
        }
      }

      // --- FLUJO B: COMANDO AGREGAR / QUITAR ---
      const regex = /(quitar|agregar)\s+(\d+)\s+(.+)/i;
      const match = texto.match(regex);

      if (match) {
        const [ , accion, cantidad, nombreBusqueda] = match;
        const { data: productosSimilares } = await supabase
          .from('productos')
          .select('*')
          .ilike('nombre', `%${nombreBusqueda}%`);

        if (!productosSimilares || productosSimilares.length === 0) {
          await enviarWhatsApp(numeroCliente, `❌ No encontré ningún producto que se llame "${nombreBusqueda}" en StockUp.`);
        } 
        else if (productosSimilares.length === 1) {
          const p = productosSimilares[0];
          const nuevoStock = accion === 'quitar' ? p.cantidad - parseInt(cantidad) : p.cantidad + parseInt(cantidad);
          await supabase.from('productos').update({ cantidad: nuevoStock }).eq('id', p.id);
          await enviarWhatsApp(numeroCliente, `✅ *StockUp:* Se ha ${accion}do ${cantidad} a *${p.nombre}*.\n📦 *Stock actual: ${nuevoStock}*`);
        } 
        else {
          // HAY VARIOS PRODUCTOS (Ambigüedad)
          await supabase.from('sesiones_bot').insert({
            numero_whatsapp: numeroCliente,
            accion: accion.toLowerCase(),
            cantidad: parseInt(cantidad),
            opciones: productosSimilares,
            esperando_seleccion: true
          });

          let lista = `🤔 Encontré varios productos similares. ¿A cuál te refieres?\n\n`;
          productosSimilares.forEach((p, i) => {
            lista += `${i + 1}️⃣ ${p.nombre} (Stock: ${p.cantidad})\n`;
          });
          lista += `\n*Responde solo con el número.*`;
          await enviarWhatsApp(numeroCliente, lista);
        }
        return res.status(200).send('OK');
      }

      // --- FLUJO C: COMANDO STOCK ---
      if (texto === "stock") {
        const { data: productos } = await supabase.from('productos').select('nombre, cantidad');
        let respuesta = "📋 *Inventario StockUp:*\n\n";
        productos.forEach(p => respuesta += `🔹 ${p.nombre}: ${p.cantidad}\n`);
        await enviarWhatsApp(numeroCliente, respuesta);
        return res.status(200).send('OK');
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }
  return res.status(405).end();
}