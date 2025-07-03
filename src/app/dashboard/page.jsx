"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FiDownload } from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa6";
import jsPDF from "jspdf";
import { MdCheckCircle, MdCancel } from "react-icons/md";

export default function HomePage() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estados, setEstados] = useState({});
  const [generando, setGenerando] = useState(false);
  const [errorGen, setErrorGen] = useState(null);
  const [ejecutandoWebhook, setEjecutandoWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState(null);

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

  async function ejecutarWebhook() {
    setEjecutandoWebhook(true);
    setWebhookError(null);
    try {
      const res = await fetch(
        "https://n8n-torta-express.qnfmlx.easypanel.host/webhook/44ccd0ac-cab7-45f8-aa48-317e9400ca2d",
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Error al ejecutar el webhook");
      // Esperar hasta que haya datos en la BDD (noticias del día)
      let intentos = 0;
      let nuevasNoticias = [];
      while (intentos < 10) { // máximo 10 intentos (~20s)
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const noticiasRes = await fetch("/api/noticias");
        nuevasNoticias = await noticiasRes.json();
        if (Array.isArray(nuevasNoticias) && nuevasNoticias.length > 0) {
          break;
        }
        intentos++;
      }
      setNoticias(Array.isArray(nuevasNoticias) ? nuevasNoticias : []);
      // Recargar la página cuando se hayan extraído noticias
      if (Array.isArray(nuevasNoticias) && nuevasNoticias.length > 0) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setWebhookError("Error al ejecutar el flujo de N8N.");
    } finally {
      setEjecutandoWebhook(false);
    }
  }

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
      const res = await fetch("/api/noticias");
      if (!res.ok) throw new Error("Error al obtener noticias desde la base de datos");
      const data = await res.json();

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
      const logoHeight = 60;
      const logoWidth = 340;
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
     y += 30;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor("#000000");
      doc.text(`Tuto Noticias - ${fechaHora}`, pageWidth / 2, y, { align: "center" });

      // Eliminar la segunda impresión de la fecha (ya se muestra en el título)
      // doc.setFont("helvetica", "normal");
      // doc.setFontSize(12);
      // doc.setTextColor("#000000");
      // doc.text(fechaHora, pageWidth / 2, y, { align: "center" });
      // y += 30;
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
        doc.setFontSize(13);
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
        // Mostrar resumenIA si existe, si no mostrar resumen normal
        const resumenMostrar = noticia.resumenIA || noticia.resumen || "";
        const resumenLines = doc.splitTextToSize(resumenMostrar, boxWidth - padding * 2);
        doc.text(resumenLines, margin + padding, cursorY);
        cursorY += resumenLines.length * 16;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor("#da0b0a");
        doc.textWithLink("Leer más", margin + padding, cursorY, {
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

      // Obtener la fecha en formato '1ro de Julio'
      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      const fechaActual = new Date();
      const dia = fechaActual.getDate();
      const sufijo = dia === 1 ? "ro" : "";
      const mes = meses[fechaActual.getMonth()];
      const nombrePDF = `TutoNoticias-${dia}${sufijo} de ${mes}`;

      doc.save(`${nombrePDF}.pdf`);
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

  // Mostrar botón de extraer noticias si no hay noticias
  if (noticias.length === 0) {
    return (
      <main className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-10 bg-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Noticias recientes</h1>
        <p className="text-gray-500 text-lg mb-6">No hay noticias disponibles.</p>
        <button
          onClick={ejecutarWebhook}
          disabled={ejecutandoWebhook}
          className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition text-base"
        >
          {ejecutandoWebhook ? "Ejecutando..." : "Cargar Noticias"}
        </button>
        {webhookError && <p className="text-red-600 mt-4">{webhookError}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-white">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <span>Noticias recientes</span>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generarBoletin}
            disabled={generando}
            className="flex items-center justify-center gap-2 bg-[#123488] text-white px-4 py-2 rounded-md hover:bg-[#0f2c6b] disabled:opacity-50 transition text-sm sm:text-base"
          >
            {generando ? (
              "Generando..."
            ) : (
              <>
                <FaFilePdf />
                <span className="whitespace-nowrap">Descargar Boletín</span>
                <FiDownload />
              </>
            )}
          </button>
          <button
            onClick={ejecutarWebhook}
            disabled={ejecutandoWebhook}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition text-sm sm:text-base"
          >
            {ejecutandoWebhook ? "Ejecutando..." : "Cargar Noticias"}
          </button>
        </div>
      </h1>

      {errorGen && <p className="text-red-600 mb-4">{errorGen}</p>}
      {webhookError && <p className="text-red-600 mb-4">{webhookError}</p>}

      <div className="grid gap-6">
        {noticias.map((noticia) => {
          const estadoActual =
            estados[noticia.id]?.toLowerCase() ||
            noticia.estado?.toLowerCase() ||
            null;

          return (
            <article
              key={noticia.id}
              className="border rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col h-full"
            >
              <h2 className="text-lg sm:text-xl font-semibold mb-1">{noticia.titulo}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                Publicado por{" "}
                <span className="font-medium">{noticia.autor || "Desconocido"}</span> el{" "}
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

              <p className="text-sm sm:text-base text-gray-700 flex-1">{noticia.resumen}</p>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-2">
                <a
                  href={noticia.url || "#"}
                  className="text-[#123488] hover:underline text-sm font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Leer más →
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => manejarEstado(noticia.id, "aprobado")}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                      estadoActual === "aprobado"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-green-400"
                    }`}
                  >
                    <MdCheckCircle className="text-lg" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => manejarEstado(noticia.id, "rechazado")}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                      estadoActual === "rechazado"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-red-400"
                    }`}
                  >
                    <MdCancel className="text-lg" />
                    Rechazar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
