import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Obtener la fecha actual en la zona horaria de Bolivia
    const nowBolivia = DateTime.now().setZone('America/La_Paz');
    
    // Calcular el límite inferior (ayer a las 8:30 AM)
    const lowerLimit = nowBolivia.minus({ days: 1 }).set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    
    // Convertir a JS Date para Prisma
    const lowerLimitDate = lowerLimit.toJSDate();
    
    console.log('Filtro desde:', lowerLimit.toString());
    
    const noticias = await prisma.news.findMany({
      where: {
        created_at: {
          gte: lowerLimitDate,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log('Noticias encontradas:', noticias.length);
    console.log('Rango de fechas:', 
      noticias[0]?.created_at, 
      'a', 
      noticias[noticias.length - 1]?.created_at);

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
