import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Hora de Bolivia a las 8:00 am
    const today8amBolivia = DateTime.now()
      .setZone('America/La_Paz')
      .set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
//fc-5ca4d08044944791b9974dbba018ac2a
    // Si tus datos están en UTC, usa esto:
    const today8amUTC = new Date();
    today8amUTC.setUTCHours(8, 0, 0, 0);
    
    console.log('Filtro UTC:', today8amUTC);
    
    const noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: today8amUTC,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log('Primer created_at:', noticias[0]?.created_at);

    return new Response(JSON.stringify(noticias), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error al obtener noticias', detail: error.message }),
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
