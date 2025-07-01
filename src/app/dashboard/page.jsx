"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiDownload } from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa6";
import jsPDF from "jspdf";

export default function HomePage() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estados, setEstados] = useState({});
  const [generando, setGenerando] = useState(false);
  const [errorGen, setErrorGen] = useState(null);

  useEffect(() => {
    async function fetchNoticias() {
      const res = await fetch("/api/noticias");
      let data = await res.json();
      if (!Array.isArray(data)) data = [];
      setNoticias(data);
      setLoading(false);
    }
    fetchNoticias();
  }, []);

  async function manejarEstado(id, nuevoEstado) {
    try {
      const res = await fetch("/api/noticias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado.toUpperCase() }),
      });

      if (!res.ok) throw new Error("Error al actualizar estado");

      await res.json();
      setEstados((prev) => ({ ...prev, [id]: nuevoEstado }));
    } catch {
      alert("No se pudo actualizar el estado de la noticia.");
    }
  }

  async function getBase64ImageFromUrl(imageUrl) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("No se pudo cargar imagen");
      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function generarBoletin() {
    setGenerando(true);
    setErrorGen(null);
  
    try {
      // Primero traemos las noticias actualizadas desde la BDD para evitar inconsistencias
      const res = await fetch("/api/noticias");
      if (!res.ok) throw new Error("Error al obtener noticias desde la base de datos");
      const data = await res.json();
  
      // Filtramos solo las noticias aprobadas según la base de datos (estado = "aprobado")
      const noticiasAprobadas = data.filter(
        (n) => n.estado?.toLowerCase() === "aprobado"
      );
  
      if (noticiasAprobadas.length === 0) {
        setErrorGen("No hay noticias aprobadas para generar el boletín.");
        setGenerando(false);
        return;
      }
  
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;
  
      const logoUrl = "https://i.ibb.co/BVtY6hmb/image-4.png";
      const logoHeight = 70;
      const logoWidth = 370;
      const logoBase64 = await getBase64ImageFromUrl(logoUrl);
  
      if (logoBase64) {
        doc.addImage(
          logoBase64,
          "PNG",
          pageWidth / 2 - logoWidth / 2,
          y,
          logoWidth,
          logoHeight
        );
      }
      y += logoHeight + 24;
  
      const fechaHora = new Date().toLocaleString("es-ES", {
        dateStyle: "full",
        timeStyle: "short",
      });
  
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor("#12358d");
      doc.text(`Boletín ${fechaHora}`, pageWidth / 2, y, { align: "center" });
  
      y += 18;
  
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor("#000000");
      doc.text(fechaHora, pageWidth / 2, y, { align: "center" });
  
      y += 30;
  
      for (let i = 0; i < noticiasAprobadas.length; i++) {
        const noticia = noticiasAprobadas[i];
        if (y > pageHeight - margin - 260) {
          doc.addPage();
          y = margin;
        }
  
        const boxWidth = pageWidth - margin * 2;
        const boxHeight = 260;
        doc.setDrawColor("#e0e0e0");
        doc.setFillColor("#ffffff");
        doc.setLineWidth(1);
        doc.roundedRect(margin, y, boxWidth, boxHeight, 6, 6, "FD");
  
        const padding = 15;
        let cursorY = y + padding;
  
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#000000");
        const fechaPub = new Date(noticia.fecha_publicacion).toLocaleDateString();
        const metaText = `${fechaPub} | Autor: ${noticia.autor || "Desconocido"}`;
        doc.text(metaText, margin + padding, cursorY);
        cursorY += 18;
  
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor("#12358d");
        const titleLines = doc.splitTextToSize(noticia.titulo, boxWidth - padding * 2);
        doc.text(titleLines, margin + padding, cursorY);
        cursorY += titleLines.length * 18;
  
        if (noticia.imagen) {
          const imgData = await getBase64ImageFromUrl(noticia.imagen);
          if (imgData) {
            const maxImgWidth = boxWidth - padding * 2;
            const imgObj = document.createElement("img");
            imgObj.src = imgData;
            await new Promise((r) => (imgObj.onload = r));
            const ratio = imgObj.naturalHeight / imgObj.naturalWidth;
            let imgWidth = maxImgWidth;
            let imgHeight = imgWidth * ratio;
            if (imgHeight > 120) {
              imgHeight = 120;
              imgWidth = imgHeight / ratio;
            }
            doc.setFillColor("#fff");
            doc.roundedRect(margin + padding - 2, cursorY - 2, imgWidth + 4, imgHeight + 4, 4, 4, "F");
            doc.addImage(imgData, "PNG", margin + padding, cursorY, imgWidth, imgHeight);
            cursorY += imgHeight + 10;
          }
        }
  
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor("#000000");
        const resumenLines = doc.splitTextToSize(noticia.resumen || "", boxWidth - padding * 2);
        doc.text(resumenLines, margin + padding, cursorY);
        cursorY += resumenLines.length * 16;
  
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor("#da0b0a");
        const linkText = "Leer más";
        doc.textWithLink(linkText, margin + padding, cursorY, {
          url: noticia.url || "#",
        });
  
        y += boxHeight + 15;
        if (i !== noticiasAprobadas.length - 1) {
          doc.setDrawColor("#cccccc");
          doc.setLineWidth(0.8);
          const dashLength = 4;
          let x = margin;
          const xEnd = pageWidth - margin;
          while (x < xEnd) {
            doc.line(x, y, x + dashLength, y);
            x += dashLength * 2;
          }
          y += 15;
        }
      }
  
      doc.save("boletin-noticias.pdf");
    } catch (e) {
      console.error(e);
      setErrorGen("Error generando PDF");
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
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-white">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <span>Noticias recientes</span>
        <button
          onClick={generarBoletin}
          disabled={generando}
          className="flex items-center justify-center gap-2 bg-[#123488] text-white px-4 py-2 rounded-md hover:bg-[#0f2c6b] disabled:opacity-50 transition text-sm sm:text-base"
          title="Generar y descargar Boletín de noticias"
        >
          {generando ? (
            "Generando..."
          ) : (
            <>
              <FaFilePdf className="hidden sm:inline" />
              <span className="whitespace-nowrap">Descargar Boletín</span>
              <FiDownload className="hidden sm:inline" />
            </>
          )}
        </button>
      </h1>
  
      {errorGen && <p className="text-red-500 mb-4">{errorGen}</p>}
  
      <div className="grid gap-6">
        {noticias.map((noticia) => {
          const estadoActual =
            estados[noticia.id]?.toLowerCase() ||
            noticia.estado?.toLowerCase() ||
            null;
  
          return (
            <article
              key={noticia.id}
              className="border rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg sm:text-xl font-semibold mb-1">{noticia.titulo}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                Publicado por <span className="font-medium">{noticia.autor || "Desconocido"}</span> el{" "}
                {new Date(noticia.fecha_publicacion ?? "").toLocaleDateString()}
              </p>
  
              {noticia.imagen && (
                <div className="relative w-full h-40 sm:h-60 mb-4 rounded overflow-hidden">
                  <Image
                    src={noticia.imagen}
                    alt={noticia.titulo}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
  
              <p className="text-sm sm:text-base text-gray-700">{noticia.resumen}</p>
  
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => manejarEstado(noticia.id, "aprobado")}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    estadoActual === "aprobado"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-green-400"
                  }`}
                >
                  Aprobar
                </button>
                <button
                  onClick={() => manejarEstado(noticia.id, "rechazado")}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    estadoActual === "rechazado"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-red-400"
                  }`}
                >
                  Rechazar
                </button>
              </div>
  
              <a
                href={noticia.url || "#"}
                className="inline-block mt-4 text-[#123488] hover:underline text-sm font-medium"
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
