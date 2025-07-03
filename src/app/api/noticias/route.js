import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener las noticias creadas hoy (hora boliviana)
export async function GET() {
  try {
    // Calcular el inicio y fin del día actual en hora boliviana (UTC-4)
    const now = new Date();
    // Convertir a hora boliviana (UTC-4)
    const utc4Offset = -4 * 60; // minutos
    const boliviaNow = new Date(
      now.getTime() + (utc4Offset - now.getTimezoneOffset()) * 60000
    );
    const startOfDay = new Date(boliviaNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(boliviaNow);
    endOfDay.setHours(23, 59, 59, 999);

    // Convertir a UTC para comparar con la base de datos
    const startUTC = new Date(startOfDay.getTime() - utc4Offset * 60000);
    const endUTC = new Date(endOfDay.getTime() - utc4Offset * 60000);

    const noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: startUTC,
          lte: endUTC,
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
