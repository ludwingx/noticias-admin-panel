// 👇 Esto debe ir en la primera línea del archivo
export const runtime = 'nodejs';

import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// GET: Obtener las noticias creadas hoy (hora boliviana)
export async function GET() {
  try {
    const boliviaNow = DateTime.now().setZone('America/La_Paz');
    let start830, end830;

    if (
      boliviaNow.hour < 8 ||
      (boliviaNow.hour === 8 && boliviaNow.minute < 30)
    ) {
      const ayer = boliviaNow.minus({ days: 1 });
      start830 = ayer.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    } else {
      start830 = boliviaNow.set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
      end830 = start830.plus({ days: 1 });
    }

    const startUTC = start830.toUTC().toJSDate();
    const endUTC = end830.toUTC().toJSDate();

    // Debug logs
    console.log("🕒 Bolivia Now:", boliviaNow.toISO());
    console.log("⏰ Inicio (UTC):", startUTC.toISOString());
    console.log("⏰ Fin (UTC):", endUTC.toISOString());

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

    console.log("📰 Noticias encontradas:", noticias.length);

    const noticiasParseadas = noticias.map((n) => ({
      ...n,
      tag: typeof n.tag === 'string' ? JSON.parse(n.tag) : n.tag,
    }));

    return new Response(JSON.stringify(noticiasParseadas), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error("❌ Error en GET:", e);
    return new Response(
      JSON.stringify({ error: 'Error al obtener noticias', detail: e.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}


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
