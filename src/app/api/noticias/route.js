import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Hora actual en Bolivia
    const nowBolivia = DateTime.now().setZone("America/La_Paz");
    console.log("Hora actual Bolivia:", nowBolivia.toISO());

    // Corte a las 8:30 AM Bolivia, pero convertido a UTC para la consulta
    // Esto es crucial: primero creamos el corte en zona Bolivia, luego convertimos a UTC
    const corteHoyBolivia = nowBolivia.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });

    let inicioBolivia, finBolivia;
    if (nowBolivia < corteHoyBolivia) {
      inicioBolivia = corteHoyBolivia.minus({ days: 1 });
      finBolivia = corteHoyBolivia;
    } else {
      inicioBolivia = corteHoyBolivia;
      finBolivia = corteHoyBolivia.plus({ days: 1 });
    }

    // Convertir ambos límites a UTC para usarlos en la consulta
    const inicioUTC = inicioBolivia.toUTC().toJSDate();
    const finUTC = finBolivia.toUTC().toJSDate();

    console.log("Rango consulta en Bolivia:", inicioBolivia.toISO(), "a", finBolivia.toISO());
    console.log("Rango consulta en UTC:", inicioUTC.toISOString(), "a", finUTC.toISOString());

    // Buscar noticias en ese rango UTC
    let noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: inicioUTC,
          lt: finUTC,
        },
      },
      orderBy: { created_at: "desc" },
    });

    console.log(`Noticias encontradas: ${noticias.length}`);
    noticias.forEach(noticia => {
      const fechaBolivia = DateTime.fromJSDate(noticia.created_at).setZone("America/La_Paz");
      console.log(`- ID: ${noticia.id}, Creado Bolivia: ${fechaBolivia.toFormat("dd/MM/yyyy HH:mm")}`);
    });

    // Si no hay noticias, fallback desde medianoche Bolivia UTC hasta ahora UTC
    if (noticias.length === 0) {
      const inicioDiaBolivia = nowBolivia.startOf("day").toUTC().toJSDate();
      const ahoraUTC = DateTime.utc().toJSDate();

      console.log("No hubo noticias en rango corte, buscando desde inicio día Bolivia a ahora UTC...");
      noticias = await prisma.news.findMany({
        where: {
          created_at: {
            gte: inicioDiaBolivia,
            lte: ahoraUTC,
          },
        },
        orderBy: { created_at: "desc" },
      });

      console.log(`Noticias encontradas fallback: ${noticias.length}`);
    }

    // Si sigue vacío, devolver últimas 10 sin filtro
    if (noticias.length === 0) {
      const ultimasNoticias = await prisma.news.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: { id: true, titulo: true, created_at: true, categoria: true },
      });

      noticias = ultimasNoticias;
    }

    return new Response(JSON.stringify(noticias), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en GET /api/noticias:", error);
    return new Response(
      JSON.stringify({ error: "Error al obtener noticias", details: error.message }),
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
