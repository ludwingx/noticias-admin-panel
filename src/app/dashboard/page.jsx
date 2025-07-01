"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function HomePage() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guardamos estados de aprobación en un objeto { [id]: "aprobado" | "rechazado" }
  const [estados, setEstados] = useState({});

  useEffect(() => {
    async function fetchNoticias() {
      const res = await fetch("/api/noticias");
      const data = await res.json();

      console.log("Datos recibidos de /api/noticias:", data);
      setNoticias(data);
      setLoading(false);
    }
    fetchNoticias();
  }, []);

  async function manejarEstado(id, nuevoEstado) {
    try {
      const res = await fetch("/api/noticias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, estado: nuevoEstado.toUpperCase() }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar estado");
      }

      const data = await res.json();
      console.log("Noticia actualizada:", data);

      // Actualizar estado local solo si backend fue exitoso
      setEstados((prev) => ({
        ...prev,
        [id]: nuevoEstado,
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado de la noticia.");
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p>Cargando noticias...</p>
      </main>
    );
  }

  if (noticias.length === 0) {
    return (
      <main className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-10 bg-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Noticias recientes</h1>
        <p className="text-gray-500 text-lg">No hay noticias disponibles.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 bg-white">
      <h1 className="text-3xl font-bold mb-6">Noticias recientes</h1>

      <div className="grid gap-6">
        {noticias.map((noticia) => {
          const estadoActual = estados[noticia.id] || noticia.estado?.toLowerCase() || null;

          return (
            <article
              key={noticia.id}
              className="border p-4 rounded shadow hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold mb-1">{noticia.titulo}</h2>
              <p className="text-sm text-gray-600 mb-2">
                Publicado por {noticia.autor || "Desconocido"} el{" "}
                {new Date(noticia.fecha_publicacion ?? "").toLocaleDateString()}
              </p>

              {noticia.imagen && (
                <div className="relative w-full h-60 mb-3">
                  <Image
                    src={noticia.imagen}
                    alt={noticia.titulo}
                    fill
                    className="object-cover rounded"
                    unoptimized
                  />
                </div>
              )}

              <p className="text-gray-700">{noticia.resumen}</p>

              <div className="mt-4 flex gap-4">
                <button
                  className={`px-4 py-2 rounded ${
                    estadoActual === "aprobado"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-green-400"
                  }`}
                  onClick={() => manejarEstado(noticia.id, "aprobado")}
                >
                  Aprobar
                </button>

                <button
                  className={`px-4 py-2 rounded ${
                    estadoActual === "rechazado"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-red-400"
                  }`}
                  onClick={() => manejarEstado(noticia.id, "rechazado")}
                >
                  Rechazar
                </button>
              </div>

              <a
                href={noticia.url || "#"}
                className="inline-block mt-4 text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Leer más →
              </a>
            </article>
          );
        })}
      </div>
    </main>
  );
}
