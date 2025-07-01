"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiDownload } from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa6";

export default function HomePage() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guardamos estados de aprobación en un objeto { [id]: "aprobado" | "rechazado" }
  const [estados, setEstados] = useState({});

  // Estado para botón de generación
  const [generando, setGenerando] = useState(false);
  const [errorGen, setErrorGen] = useState(null);

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

      setEstados((prev) => ({
        ...prev,
        [id]: nuevoEstado,
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado de la noticia.");
    }
  }

  async function generarBoletin() {
    setGenerando(true);
    setErrorGen(null);
  
    try {
      const response = await fetch(
        "https://n8n-torta-express.qnfmlx.easypanel.host/webhook-test/44ccd0ac-cab7-45f8-aa48-317e9400ca2d",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
  
      if (!response.ok) throw new Error("Error al generar boletín");
  
      const data = await response.json();
      console.log("Datos recibidos del webhook:", data);
  
      // Extraer URL de descarga desde la respuesta
      const urlPDF = data?.[0]?.document_card?.download_url;
      if (!urlPDF) throw new Error("No se encontró URL de descarga del PDF");
  
      // Descargar el PDF desde la URL
      const pdfResponse = await fetch(urlPDF);
      if (!pdfResponse.ok) throw new Error("Error descargando PDF");
  
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "boletin-noticias.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
  
    } catch (error) {
      console.error(error);
      setErrorGen(error.message);
    } finally {
      setGenerando(false);
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
      <h1 className="text-3xl font-bold mb-6 flex items-center justify-between">
        Noticias recientes
        <button
          onClick={generarBoletin}
          disabled={generando}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          title="Generar y descargar Boletín de noticias"
        >
          {generando ? (
            "Generando..."
          ) : (
            <>
              <FaFilePdf />
              Descargar Boletín
              <FiDownload />
            </>
          )}
        </button>
      </h1>

      {errorGen && <p className="text-red-500 mb-4">{errorGen}</p>}

      <div className="grid gap-6">
        {noticias.map((noticia) => {
          const estadoActual =
            estados[noticia.id] || noticia.estado?.toLowerCase() || null;

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
