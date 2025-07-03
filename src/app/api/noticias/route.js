
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// GET: Obtener las noticias creadas hoy (hora boliviana)
export async function GET() {
  try {
    // Usar Luxon para manejar la zona horaria de Bolivia
    const boliviaNow = DateTime.now().setZone('America/La_Paz');
    let start830, end830;
    if (
      boliviaNow.hour < 8 ||
      (boliviaNow.hour === 8 && boliviaNow.minute < 30)
    ) {
      // Antes de las 8:30 am: mostrar noticias desde ayer 8:30 am hasta hoy 8:30 am
      const ayer = boliviaNow.minus({ days: 1 });
      start830 = ayer.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    } else {
      // Después de las 8:30 am: mostrar noticias desde hoy 8:30 am hasta mañana 8:30 am
      start830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = start830.plus({ days: 1 });
    }
    // Convertir a UTC para comparar con la base de datos
    const startUTC = start830.toUTC().toJSDate();
    const endUTC = end830.toUTC().toJSDate();

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
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Error al obtener noticias', detail: e.message }),
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
