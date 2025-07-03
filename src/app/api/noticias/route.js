// 👇 Esto debe ir en la primera línea del archivo
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// GET: Obtener las noticias creadas hoy (hora boliviana)
export async function GET() {
  try {
    // Toma el tiempo UTC actual y conviértelo a la zona de Bolivia
    const nowUtc = DateTime.utc();
    const boliviaNow = nowUtc.setZone('America/La_Paz');

    let start830, end830;

    if (
      boliviaNow.hour < 8 ||
      (boliviaNow.hour === 8 && boliviaNow.minute < 30)
    ) {
      // Si es antes de 8:30 am boliviano, busca desde ayer 8:30 am hasta hoy 8:30 am
      const ayer = boliviaNow.minus({ days: 1 });
      start830 = ayer.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    } else {
      // Si es después de 8:30 am boliviano, rango desde hoy 8:30 am hasta mañana 8:30 am
      start830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = start830.plus({ days: 1 });
    }

    // Convierte a UTC para consultar la BD que debe tener timestamps en UTC
    const startUTC = start830.toUTC().toJSDate();
    const endUTC = end830.toUTC().toJSDate();

    // Log para depurar el rango de fechas usado
    console.log('Rango UTC para consulta:', startUTC.toISOString(), '->', endUTC.toISOString());

    // Consulta con prisma según el rango UTC
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

    return new Response(
      JSON.stringify({
        boliviaNow: boliviaNow.toISO(),
        startUTC: startUTC.toISOString(),
        endUTC: endUTC.toISOString(),
        noticias: noticias.map((n) => ({
          id: n.id,
          created_at: n.created_at.toISOString(),
          // otros campos que quieras enviar...
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('Error en GET /api/noticias:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
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
    console.error('Error en PUT /api/noticias:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al actualizar noticia',
        detail: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
