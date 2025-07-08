import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Hora actual en Bolivia
    const nowBolivia = DateTime.now().setZone("America/La_Paz");
    console.log("Hora actual Bolivia:", nowBolivia.toISO());

    // Definir corte a las 8:30 AM Bolivia
    const corteHoy = nowBolivia.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });

    let inicioBolivia, finBolivia;
    if (nowBolivia < corteHoy) {
      inicioBolivia = corteHoy.minus({ days: 1 });
      finBolivia = corteHoy;
    } else {
      inicioBolivia = corteHoy;
      finBolivia = corteHoy.plus({ days: 1 });
    }

    const inicioUTC = inicioBolivia.toUTC().toJSDate();
    const finUTC = finBolivia.toUTC().toJSDate();

    console.log("Rango de consulta (Bolivia):", inicioBolivia.toISO(), "a", finBolivia.toISO());
    console.log("Rango de consulta (UTC):", inicioUTC.toISOString(), "a", finUTC.toISOString());

    // Primero intento con el rango definido por corte 8:30 am
    let noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: inicioUTC,
          lt: finUTC,
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Si no hay noticias en ese rango, buscar en las últimas 24 horas UTC (fallback)
    if (noticias.length === 0) {
      const nowUTC = DateTime.utc();
      noticias = await prisma.news.findMany({
        where: {
          created_at: {
            gte: nowUTC.minus({ hours: 24 }).toJSDate(),
            lte: nowUTC.toJSDate(),
          },
        },
        orderBy: { created_at: "desc" },
      });

      console.log("No hubo noticias en el rango 8:30 am, buscando últimas 24 horas UTC...");
    }

    console.log("Noticias encontradas:", noticias.length);

    if (noticias.length === 0) {
      // Mostrar últimas 10 noticias sin filtro
      const ultimasNoticias = await prisma.news.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: { id: true, titulo: true, created_at: true, categoria: true },
      });

      console.log("Últimas noticias registradas (sin filtro):");
      ultimasNoticias.forEach((n) => {
        const fechaBolivia = DateTime.fromJSDate(n.created_at).setZone("America/La_Paz");
        console.log(
          `- ID: ${n.id}, Título: ${n.titulo}, Hora Bolivia: ${fechaBolivia.toFormat("dd/MM/yyyy HH:mm")}, Categoría: ${n.categoria || "N/A"}`
        );
      });
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

// PUT se mantiene igual
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
