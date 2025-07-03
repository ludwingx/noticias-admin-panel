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
  const [timer, setTimer] = useState(20);
  const [waiting, setWaiting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [noNews, setNoNews] = useState(false);
  const [intentosSinNoticias, setIntentosSinNoticias] = useState(0);
  const [actualizandoEstado, setActualizandoEstado] = useState({});
  const [contador, setContador] = useState(null);
  // Hora local para mostrar debajo del botón
  const [horaLocal, setHoraLocal] = useState('');
  const [activeSection, setActiveSection] = useState("all");

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  useEffect(() => {
    const updateHora = () => {
      const ahora = new Date();
      setHoraLocal(ahora.toLocaleTimeString());
    };
    updateHora();
    const interval = setInterval(updateHora, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Lógica de polling y espera reutilizable para cualquier acción relevante
  async function esperarCambioNoticias(condicionCambio, maxIntentos = 3) {
    setWaiting(true);
    setShowModal(true);
    setNoNews(false);
    setTimer(20);
    setIntentosSinNoticias(0);
    let keepWaiting = true;
    let foundCambio = false;
    let intentos = 0;
    try {
      while (keepWaiting) {
        // Temporizador de 20 segundos
        for (let t = 20; t > 0; t--) {
          setTimer(t);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setTimer(0);
        // Consultar noticias
        const noticiasRes = await fetch("/api/noticias");
        const nuevasNoticias = await noticiasRes.json();
        if (condicionCambio(nuevasNoticias)) {
          setNoticias(nuevasNoticias);
          foundCambio = true;
          keepWaiting = false;
          setWaiting(false);
          setShowModal(false);
          setIntentosSinNoticias(0);
          setNoNews(false);
          break;
        } else {
          intentos++;
          setIntentosSinNoticias(intentos);
          if (intentos >= maxIntentos) {
            setNoNews(true);
          }
        }
      }
      if (!foundCambio) {
        setWaiting(false);
      }
    } catch (err) {
      console.error(err);
      setWebhookError("Error al esperar cambios en las noticias.");
      setWaiting(false);
      setShowModal(false);
      setIntentosSinNoticias(0);
      setNoNews(false);
    }
  }

  // Reemplazar ejecutarWebhook para usar la función genérica
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
      // Esperar hasta que haya noticias nuevas
      await esperarCambioNoticias((nuevasNoticias) => Array.isArray(nuevasNoticias) && nuevasNoticias.length > 0);
    } catch (err) {
      setWebhookError("Error al ejecutar el flujo de N8N.");
      setWaiting(false);
      setShowModal(false);
      setIntentosSinNoticias(0);
      setNoNews(false);
    } finally {
      setEjecutandoWebhook(false);
    }
  }

  async function manejarEstado(id, nuevoEstado) {
    setActualizandoEstado((prev) => ({ ...prev, [id]: true }));
    setWaiting(true);
    setShowModal(true);
    setNoNews(false);
    setTimer(20);
    setIntentosSinNoticias(0);
    try {
      const res = await fetch("/api/noticias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado.toUpperCase() }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      await res.json();
      // Esperar hasta que el estado de la noticia cambie en la tabla News
      await esperarCambioNoticias(
        (nuevasNoticias) => {
          const noticiaActualizada = nuevasNoticias.find((n) => n.id === id);
          return noticiaActualizada && noticiaActualizada.estado?.toLowerCase() === nuevoEstado.toLowerCase();
        }
      );
    } catch {
      alert("No se pudo actualizar el estado de la noticia.");
      setWaiting(false);
      setShowModal(false);
      setIntentosSinNoticias(0);
      setNoNews(false);
    } finally {
      setActualizandoEstado((prev) => ({ ...prev, [id]: false }));
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
      y += 30;
  
      // Primera página: máximo 2 noticias
      let noticiasEnPrimeraPagina = Math.min(noticiasAprobadas.length, 2);
      let noticiasRestantes = noticiasAprobadas.length - noticiasEnPrimeraPagina;
  
      // Procesar primera página (2 noticias)
      for (let i = 0; i < noticiasEnPrimeraPagina; i++) {
        const noticia = noticiasAprobadas[i];
        const boxHeight = 240;
  
        const boxWidth = pageWidth - margin * 2;
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
      }
  
      // Si hay más noticias, crear nuevas páginas con 3 noticias cada una
      if (noticiasRestantes > 0) {
        let noticiasEnPagina = 0;
        doc.addPage();
        y = margin;
      
        for (let i = noticiasEnPrimeraPagina; i < noticiasAprobadas.length; i++) {
          const noticia = noticiasAprobadas[i];
          const boxHeight = 260;
      
          // Si ya hay 3 noticias en la página, crear nueva página
          if (noticiasEnPagina === 3) {
            doc.addPage();
            y = margin;
            noticiasEnPagina = 0;
          }
      
          const boxWidth = pageWidth - margin * 2;
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
      
          y += boxHeight + 5;
          noticiasEnPagina++;
        }
      }
  
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

  // Modal de espera
  function ModalEspera() {
    const [dots, setDots] = useState('');
    useEffect(() => {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
      }, 400);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center min-w-[300px]">
          <span className="text-lg font-semibold mb-2">Buscando noticias{dots}</span>
        </div>
      </div>
    );
  }

  // Utilidad para saber si hay noticias de hoy (hora boliviana) usando created_at
  function hayNoticiasDeHoy() {
    const ahora = new Date();
    // Hora boliviana UTC-4
    const ahoraBolivia = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const yyyy = ahoraBolivia.getFullYear();
    const mm = ahoraBolivia.getMonth();
    const dd = ahoraBolivia.getDate();
    return noticias.some(n => {
      if (!n.created_at) return false;
      const fecha = new Date(n.created_at);
      const fechaBolivia = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
      return fechaBolivia.getFullYear() === yyyy && fechaBolivia.getMonth() === mm && fechaBolivia.getDate() === dd;
    });
  }

  // hooks y lógica de noticias filtradas
  // Separar noticias por categoría usando el campo 'categoria'
  const noticiasTuto = noticias.filter(n => (n.categoria || '').toUpperCase() === 'TUTO');
  const noticiasJP = noticias.filter(n => (n.categoria || '').toUpperCase() === 'JP');
  const noticiasOtros = noticias.filter(n => {
    const cat = (n.categoria || '').toUpperCase();
    return cat !== 'TUTO' && cat !== 'JP';
  });

  const noticiasFiltradas = noticias;
  const yaExtrajoHoy = noticias.length > 0; // Timeout si hay cualquier noticia
  const hayNoticias = noticias.length > 0;

  // El timeout y contador solo si hay cualquier noticia
  useEffect(() => {
    let interval;
    function updateContador() {
      if (yaExtrajoHoy) {
        setContador(getTiempoRestanteHasta8amSiguiente());
      } else {
        setContador(null);
      }
    }
    updateContador();
    if (yaExtrajoHoy) {
      interval = setInterval(updateContador, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [yaExtrajoHoy]);

  // Encuentra la primera noticia extraída hoy después de las 8:30 am
  function getTiempoRestanteHasta8amSiguiente() {
    const ahora = new Date();
    // Hora boliviana UTC-4
    const ahoraBolivia = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    let siguiente8 = new Date(ahoraBolivia);
    siguiente8.setHours(8, 0, 0, 0); // 8:00 am
    if (ahoraBolivia >= siguiente8) {
      // Si ya pasó hoy a las 8:00, sumar un día
      siguiente8.setDate(siguiente8.getDate() + 1);
    }
    const diff = siguiente8 - ahoraBolivia;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    return { horas, minutos, segundos };
  }

  // Calcula el tiempo restante hasta las 8:30 am del día siguiente (hora boliviana)
  function getTiempoRestanteHasta830amSiguiente() {
    const ahora = new Date();
    // Hora boliviana UTC-4
    const ahoraBolivia = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    let siguiente830 = new Date(ahoraBolivia);
    siguiente830.setHours(8, 30, 0, 0);
    if (ahoraBolivia >= siguiente830) {
      // Si ya pasó hoy a las 8:30, sumar un día
      siguiente830.setDate(siguiente830.getDate() + 1);
    }
    const diff = siguiente830 - ahoraBolivia;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);
    return { horas, minutos, segundos };
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p>Cargando noticias...</p>
      </main>
    );
  }

  if (!loading && noticiasFiltradas.length === 0) {
    return (
      <main className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-10 bg-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Noticias recientes</h1>
        <p className="text-gray-500 text-lg mb-6">No hay noticias disponibles.</p>
        <button
          onClick={ejecutarWebhook}
          disabled={ejecutandoWebhook || waiting || hayNoticias}
          className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition text-base"
        >
          {ejecutandoWebhook || waiting
            ? "Ejecutando..."
            : (hayNoticias && contador !== null)
              ? `Disponible en ${contador && contador.horas.toString().padStart(2, '0')}:${contador && contador.minutos.toString().padStart(2, '0')}:${contador && contador.segundos.toString().padStart(2, '0')}`
              : "Cargar Noticias"}
        </button>
        <p className="text-gray-400 mt-2 text-sm">Hora local: {horaLocal}</p>
        {hayNoticias && contador !== null && (
          <p className="text-yellow-600 mt-4">Ya se extrajeron noticias. Podrás volver a cargar a las 8:30 am de mañana.</p>
        )}
        {webhookError && <p className="text-red-600 mt-4">{webhookError}</p>}
        {showModal && <ModalEspera />}
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
            disabled={ejecutandoWebhook || waiting || hayNoticias}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition text-sm sm:text-base"
          >
            {ejecutandoWebhook || waiting
              ? "Ejecutando..."
              : (hayNoticias && contador !== null)
                ? `Disponible en ${contador && contador.horas.toString().padStart(2, '0')}:${contador && contador.minutos.toString().padStart(2, '0')}:${contador && contador.segundos.toString().padStart(2, '0')}`
                : "Cargar Noticias"}
          </button>
        </div>
      </h1>

      <div className="flex items-center gap-2 mb-6">
  <span className="text-gray-600 text-sm font-medium">Filtrar por:</span>
  <select
    value={activeSection}
    onChange={e => handleSectionChange(e.target.value)}
    className="ml-2 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
  >
    <option value="all">Todas</option>
    <option value="tuto">Tuto Quiroga</option>
    <option value="jp">Juan Pablo Velasco</option>
    <option value="otros">Otras Noticias</option>
  </select>
</div>

      {errorGen && <p className="text-red-600 mb-4">{errorGen}</p>}
      {webhookError && <p className="text-red-600 mb-4">{webhookError}</p>}

      {/* Noticias TUTO */}
      {activeSection === "all" || activeSection === "tuto" ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-[#123488]">Noticias de: Tuto Quiroga</h2>
          {noticiasTuto.length > 0 ? (
            <div className="grid gap-6">
              {noticiasTuto.map((noticia) => {
                const estadoActual =
                  estados[noticia.id]?.toLowerCase() ||
                  noticia.estado?.toLowerCase() ||
                  null;
                const estaActualizando = actualizandoEstado[noticia.id];

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
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "aprobado"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-green-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCheckCircle className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Aprobar"}
                        </button>
                        <button
                          onClick={() => manejarEstado(noticia.id, "rechazado")}
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "rechazado"
                              ? "bg-red-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-red-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCancel className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Rechazar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Hoy no hay noticias de Tuto Quiroga.</p>
          )}
          <hr className="border-t border-gray-300 mt-6" />
        </div>
      ) : null}

      {/* Noticias JP */}
      {activeSection === "all" || activeSection === "jp" ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-[#da0b0a]">Noticias de: Juan Pablo Velasco</h2>
          {noticiasJP.length > 0 ? (
            <div className="grid gap-6">
              {noticiasJP.map((noticia) => {
                const estadoActual =
                  estados[noticia.id]?.toLowerCase() ||
                  noticia.estado?.toLowerCase() ||
                  null;
                const estaActualizando = actualizandoEstado[noticia.id];

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
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "aprobado"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-green-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCheckCircle className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Aprobar"}
                        </button>
                        <button
                          onClick={() => manejarEstado(noticia.id, "rechazado")}
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "rechazado"
                              ? "bg-red-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-red-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCancel className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Rechazar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Hoy no hay noticias de Juan Pablo Velasco.</p>
          )}
          <hr className="border-t border-gray-300 mt-6" />
        </div>
      ) : null}

      {/* Noticias OTROS */}
      {activeSection === "all" || activeSection === "otros" ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Otras Noticias</h2>
          {noticiasOtros.length > 0 ? (
            <div className="grid gap-6">
              {noticiasOtros.map((noticia) => {
                const estadoActual =
                  estados[noticia.id]?.toLowerCase() ||
                  noticia.estado?.toLowerCase() ||
                  null;
                const estaActualizando = actualizandoEstado[noticia.id];

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
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "aprobado"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-green-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCheckCircle className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Aprobar"}
                        </button>
                        <button
                          onClick={() => manejarEstado(noticia.id, "rechazado")}
                          disabled={estaActualizando}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                            estadoActual === "rechazado"
                              ? "bg-red-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-red-400"
                          } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <MdCancel className="text-lg" />
                          {estaActualizando ? "Actualizando..." : "Rechazar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No hay noticias cargadas.</p>
          )}
          <hr className="border-t border-gray-300 mt-6" />
        </div>
      ) : null}
    </main>
  );
}
