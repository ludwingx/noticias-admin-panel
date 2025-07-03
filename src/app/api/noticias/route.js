import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener las noticias creadas hoy (hora boliviana)
export async function GET() {
  try {
    // Calcular el rango: desde las 8:30 am de hoy hasta las 8:30 am de mañana (hora boliviana)
    const now = new Date();
    const utc4Offset = -4 * 60; // minutos
    const boliviaNow = new Date(
      now.getTime() + (utc4Offset - now.getTimezoneOffset()) * 60000
    );
    // Si la hora actual en Bolivia es antes de las 8:30 am, mostrar noticias desde las 8:30 am de AYER hasta las 8:30 am de HOY
    // Si es después de las 8:30 am, mostrar desde las 8:30 am de HOY hasta las 8:30 am de MAÑANA
    let start830, end830;
    if (
      boliviaNow.getHours() < 8 ||
      (boliviaNow.getHours() === 8 && boliviaNow.getMinutes() < 30)
    ) {
      // Antes de las 8:30 am: mostrar noticias desde ayer 8:30 am hasta hoy 8:30 am
      const ayer = new Date(boliviaNow);
      ayer.setDate(boliviaNow.getDate() - 1);
      start830 = new Date(ayer);
      start830.setHours(8, 30, 0, 0);
      end830 = new Date(boliviaNow);
      end830.setHours(8, 30, 0, 0);
    } else {
      // Después de las 8:30 am: mostrar noticias desde hoy 8:30 am hasta mañana 8:30 am
      start830 = new Date(boliviaNow);
      start830.setHours(8, 30, 0, 0);
      end830 = new Date(start830);
      end830.setDate(start830.getDate() + 1);
    }
    // Convertir a UTC para comparar con la base de datos
    const startUTC = new Date(start830.getTime() - utc4Offset * 60000);
    const endUTC = new Date(end830.getTime() - utc4Offset * 60000);

    const noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: startUTC,
          lt: endUTC,
        },
      },
      orderBy: { fecha_publicacion: 'desc' },
      take: 10,
    });

    const noticiasParseadas = noticias.map((n) => ({
      ...n,
      tag: typeof n.tag === 'string' ? JSON.parse(n.tag) : n.tag,
    }));

    return new Response(JSON.stringify(noticiasParseadas), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Error al obtener noticias' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// PUT: Aprobar o rechazar noticia
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: 'id' o 'estado'" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const noticiaActualizada = await prisma.news.update({
      where: { id: Number(id) },
      data: { estado },
    });

    return new Response(JSON.stringify(noticiaActualizada), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error al actualizar noticia', detail: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
