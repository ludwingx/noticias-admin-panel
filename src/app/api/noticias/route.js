import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // 1. Configuración de zonas horarias
    const zonaBolivia = "America/La_Paz";
    
    // 2. Obtener tiempos actuales
    const ahoraUTC = DateTime.utc();
    const ahoraBolivia = ahoraUTC.setZone(zonaBolivia);
    
    console.log(`[DEBUG] Hora actual UTC: ${ahoraUTC.toISO()}`);
    console.log(`[DEBUG] Hora actual Bolivia: ${ahoraBolivia.toISO()}`);

    // 3. Definir el corte a las 8:30 AM Bolivia
    const corteHoyBolivia = ahoraBolivia.set({ 
      hour: 4, 
      minute: 30, 
      second: 0, 
      millisecond: 0 
    });
    const corteHoyUTC = corteHoyBolivia.toUTC();
    
    console.log(`[DEBUG] Corte hoy Bolivia: ${corteHoyBolivia.toISO()}`);
    console.log(`[DEBUG] Corte hoy UTC: ${corteHoyUTC.toISO()}`);

    // 4. Determinar rango de búsqueda
    let inicioBusquedaUTC, finBusquedaUTC;
    
    if (ahoraBolivia >= corteHoyBolivia) {
      // Si ya pasó 8:30 AM hoy, buscar desde 8:30 AM hoy hasta 8:30 AM mañana
      inicioBusquedaUTC = corteHoyUTC;
      finBusquedaUTC = corteHoyUTC.plus({ days: 1 });
    } else {
      // Si aún no son las 8:30 AM hoy, buscar desde 8:30 AM de ayer hasta 8:30 AM hoy
      inicioBusquedaUTC = corteHoyUTC.minus({ days: 1 });
      finBusquedaUTC = corteHoyUTC;
    }

    console.log(`[DEBUG] Rango de búsqueda UTC: ${inicioBusquedaUTC.toISO()} - ${finBusquedaUTC.toISO()}`);
    console.log(`[DEBUG] Equivalente Bolivia: ${inicioBusquedaUTC.setZone(zonaBolivia).toISO()} - ${finBusquedaUTC.setZone(zonaBolivia).toISO()}`);

    // 5. Consulta a la base de datos
    const noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: inicioBusquedaUTC.toJSDate(),
          lt: finBusquedaUTC.toJSDate() // Usamos lt (menor que) en lugar de lte (menor o igual)
        }
      },
      orderBy: { created_at: "desc" }
    });

    // 6. Transformar las fechas para el frontend
    const noticiasConFechaFormateada = noticias.map(noticia => {
      const fechaUTC = DateTime.fromJSDate(noticia.created_at).toUTC();
      const fechaBolivia = fechaUTC.setZone(zonaBolivia);
      
      return {
        ...noticia,
        created_at: fechaBolivia.toISO(),
        created_at_bolivia: fechaBolivia.toFormat("dd/MM/yyyy HH:mm:ss"),
        created_at_utc: fechaUTC.toISO()
      };
    });

    console.log(`[DEBUG] Noticias encontradas: ${noticiasConFechaFormateada.length}`);
    noticiasConFechaFormateada.forEach(n => {
      console.log(`- ID: ${n.id}, Título: ${n.titulo.substring(0, 20)}...`);
      console.log(`  Hora Bolivia: ${n.created_at_bolivia}`);
      console.log(`  Hora UTC: ${n.created_at_utc}`);
    });

    // 7. Enviar respuesta con cabeceras que eviten caché
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache"
    };

    return new Response(JSON.stringify(noticiasConFechaFormateada), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("[ERROR] En GET /api/noticias:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error al obtener noticias", 
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PUT permanece igual
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: 'id' o 'estado'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const noticiaActualizada = await prisma.news.update({
      where: { id: Number(id) },
      data: { estado },
    });

    return new Response(JSON.stringify(noticiaActualizada), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error al actualizar noticia", detail: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}