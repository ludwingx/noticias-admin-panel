import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Hora actual en Bolivia
    const nowBolivia = DateTime.now().setZone("America/La_Paz");
    console.log("Hora actual Bolivia:", nowBolivia.toISO());

    // Corte a las 8:30 AM Bolivia
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

    // Buscar noticias en rango con corte 8:30 AM
    let noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: inicioUTC,
          lt: finUTC,
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Log de fechas de noticias encontradas para verificar
    console.log("Noticias encontradas en rango 8:30 AM:");
    noticias.forEach((n) => {
      const fechaBolivia = DateTime.fromJSDate(n.created_at).setZone("America/La_Paz");
      console.log(`- ID: ${n.id}, Creado: ${fechaBolivia.toFormat("dd/MM/yyyy HH:mm")}`);
    });

    // Si no hay noticias, fallback: buscar noticias desde medianoche hoy hasta ahora
    if (noticias.length === 0) {
      const hoyInicio = nowBolivia.startOf("day").toUTC().toJSDate();
      const ahoraUTC = nowBolivia.toUTC().toJSDate();

      console.log("No hubo noticias en el rango 8:30 am, buscando desde medianoche hoy hasta ahora...");
      noticias = await prisma.news.findMany({
        where: {
          created_at: {
            gte: hoyInicio,
            lte: ahoraUTC,
          },
        },
        orderBy: { created_at: "desc" },
      });

      console.log("Noticias encontradas desde medianoche hasta ahora:");
      noticias.forEach((n) => {
        const fechaBolivia = DateTime.fromJSDate(n.created_at).setZone("America/La_Paz");
        console.log(`- ID: ${n.id}, Creado: ${fechaBolivia.toFormat("dd/MM/yyyy HH:mm")}`);
      });
    }

    // Si sigue sin haber noticias, mostrar últimas 10 sin filtro
    if (noticias.length === 0) {
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

      // Para no devolver array vacío, devolvemos estas últimas
      noticias = ultimasNoticias;
    }

    console.log("Cantidad total de noticias devueltas:", noticias.length);

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
