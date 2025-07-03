import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obtener hora actual en Bolivia
    const boliviaNow = DateTime.now().setZone('America/La_Paz');
    let start830, end830;

    if (!boliviaNow.isValid) {
      throw new Error('Fecha no válida en zona horaria America/La_Paz');
    }

    // Definir rango: 8:30 am a 8:30 am (Bolivia)
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

    // Convertir a UTC
    const startUTC = start830.toUTC().toJSDate();
    const endUTC = end830.toUTC().toJSDate();

    // 🔍 Logs para desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.log("🕒 Bolivia Now:", boliviaNow.toISO());
      console.log("🔽 Rango Bolivia:");
      console.log("⏰ Inicio (Bolivia):", start830.toISO());
      console.log("⏰ Fin (Bolivia):", end830.toISO());
      console.log("🌐 Rango UTC:");
      console.log("⏰ Inicio (UTC):", startUTC.toISOString());
      console.log("⏰ Fin (UTC):", endUTC.toISOString());
    }

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

    // Si estás en desarrollo, puedes ver la cantidad de noticias
    if (process.env.NODE_ENV !== 'production') {
      console.log("📰 Noticias encontradas:", noticias.length);
    }

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
