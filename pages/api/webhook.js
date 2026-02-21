import { supabase } from '../../lib/supabase'; 

export default async function handler(req, res) {
  // --- TUS LLAVES ---
  const MI_TOKEN_META = "MatiBodega2026";
  const META_ACCESS_TOKEN = "EAAMNe1rjVWEBQ0N76gauefGRePB0E8G2gs9t3Le58Dn3A6sz5SChkCZBIMZBiaeBs8qxvejn98LWuWO22MUD2O7WE9ZBvD4QzZCDqDazxe5xfN52v970XloAGYwWk0hWJYJ3U7Nz2Cc6uUPf2Gm7vDqjAzgsc15f6kygt4aQWD0XaXlBfmrjJQtTLZCKZCHgBaPDeIZAnVYEO5LVcIxy4ScmPiSKzAuVWcjTzeOabU5SGZCygKgfUiHyMNTC4pFscZCKlKuNqiCRqcE4Uog3SazF7uiU6sZCQZD";
  const PHONE_NUMBER_ID = "996700506860030";

  if (req.method === 'GET') {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (token === MI_TOKEN_META) return res.status(200).send(challenge);
    return res.status(403).send("Error");
  }

  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const mensaje = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (mensaje) {
        const texto = mensaje.text.body.toLowerCase();
        const numeroCliente = mensaje.from;

        if (texto.includes("stock")) {
          const { data: productos, error } = await supabase.from('productos').select('nombre, cantidad');
          
          if (!error && productos) {
            // 1. Armamos el mensaje de texto
            let textoRespuesta = "📋 *Inventario Actual de la Bodega:*\n\n";
            productos.forEach(p => {
              textoRespuesta += `🔹 ${p.nombre}: ${p.cantidad}\n`;
            });

            // 2. LE DECIMOS A META QUE ENVIÉ EL WHATSAPP
            try {
              await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: numeroCliente,
                  type: "text",
                  text: { body: textoRespuesta }
                })
              });
              console.log("✅ Respuesta enviada por WhatsApp al cliente");
            } catch (err) {
              console.error("❌ Error enviando el WhatsApp:", err);
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(404).send('Not Found');
  }
  return res.status(405).end();
}