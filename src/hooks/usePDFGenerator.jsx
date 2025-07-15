import { useState } from "react";
import jsPDF from "jspdf";

export function usePDFGenerator(noticias) {
  const [generando, setGenerando] = useState(false);
  const [errorGen, setErrorGen] = useState(null);

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
      if (!res.ok)
        throw new Error("Error al obtener noticias desde la base de datos");
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

      // Cargar imágenes de cabecera desde URLs
      const [logoIzquierda, logoCentro] = await Promise.all([
        getBase64ImageFromUrl("https://i.postimg.cc/rFJtBVqs/Proyecto-nuevo-3.png"),
        getBase64ImageFromUrl("https://i.postimg.cc/MZDMg3pY/Proyecto-nuevo-1.png"),
      ]);

      // Altura máxima para la cabecera
      const headerHeight = 40;
      const logoWidth = 100;
      const logoY = y;
      const logoHeight = headerHeight;

      // Agregar logo izquierdo (alineado extremo izquierdo)
      if (logoIzquierda) {
        doc.addImage(
          logoIzquierda,
          "PNG",
          margin,
          logoY,
          logoWidth,
          logoHeight
        );
      }

      // Agregar logo derecho (alineado extremo derecho)
      if (logoCentro) {
        doc.addImage(
          logoCentro,
          "PNG",
          pageWidth - margin - logoWidth,
          logoY,
          logoWidth,
          logoHeight
        );
      }

      // Título centrado en la cabecera
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor("#12358d");
      doc.text("Tuto Noticias", pageWidth / 2, logoY + 28, { align: "center" });

      // Fecha y hora centradas debajo del título
      const fechaHora = new Date().toLocaleString("es-ES", {
        dateStyle: "full",
        timeStyle: "short",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor("#6c757d");
      doc.text(fechaHora, pageWidth / 2, logoY + 45, { align: "center" });

      y += headerHeight + 35; // Espacio después de la cabecera

      // Primera página: máximo 2 noticias
      let noticiasEnPrimeraPagina = Math.min(noticiasAprobadas.length, 2);
      let noticiasRestantes = noticiasAprobadas.length - noticiasEnPrimeraPagina;

      // Procesar primera página (2 noticias)
      for (let i = 0; i < noticiasEnPrimeraPagina; i++) {
        const noticia = noticiasAprobadas[i];
        y = await agregarNoticiaAPDF(doc, noticia, y, pageWidth, margin, false);
      }

      // Si hay más noticias, crear nuevas páginas con 3 noticias cada una
      if (noticiasRestantes > 0) {
        doc.addPage();
        y = margin;
        let noticiasEnPagina = 0;

        for (let i = noticiasEnPrimeraPagina; i < noticiasAprobadas.length; i++) {
          const noticia = noticiasAprobadas[i];

          // Si ya hay 3 noticias en la página, crear nueva página
          if (noticiasEnPagina === 3) {
            doc.addPage();
            y = margin;
            noticiasEnPagina = 0;
          }

          y = await agregarNoticiaAPDF(doc, noticia, y, pageWidth, margin, true);
          noticiasEnPagina++;
        }
      }

      // Nombre del archivo PDF
      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
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

  async function agregarNoticiaAPDF(doc, noticia, y, pageWidth, margin, isCompact = false) {
    const boxWidth = pageWidth - margin * 2;
    const padding = 15;
    let cursorY = y + padding;

    // Estilo de la caja
    doc.setDrawColor("#e0e0e0");
    doc.setFillColor("#ffffff");
    doc.setLineWidth(1);

    // Metadatos
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    const fechaPub = new Date(noticia.fecha_publicacion).toLocaleDateString();
    const metaText = `${fechaPub} | Autor: ${noticia.autor || "Desconocido"}`;
    doc.text(metaText, margin + padding, cursorY);
    cursorY += 18;

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor("#12358d");
    const titleLines = doc.splitTextToSize(noticia.titulo, boxWidth - padding * 2);
    doc.text(titleLines, margin + padding, cursorY);
    cursorY += titleLines.length * 18;

    // Imagen expandida casi a todo el ancho
    if (noticia.imagen) {
      const imgData = await getBase64ImageFromUrl(noticia.imagen);
      if (imgData) {
        // Deja solo un pequeño margen a los lados
        const sideMargin = 12;
        const maxImgWidth = boxWidth - sideMargin * 2;
        const imgObj = document.createElement("img");
        imgObj.src = imgData;
        await new Promise((r) => (imgObj.onload = r));
        const ratio = imgObj.naturalHeight / imgObj.naturalWidth;
        let imgWidth = maxImgWidth;
        let imgHeight = imgWidth * ratio;
        
        // Ajuste de tamaño
        if (isCompact) {
          imgHeight = Math.min(imgHeight, 100);
        } else {
          imgHeight = Math.min(imgHeight, 170);
        }
        imgWidth = imgHeight / ratio;
        // Si la imagen es demasiado ancha, recorta al máximo permitido
        if (imgWidth > maxImgWidth) imgWidth = maxImgWidth;
        // Centrado horizontal
        const imgX = margin + sideMargin + (maxImgWidth - imgWidth) / 2;
        // Marco para la imagen (sutil sombra)
        doc.setFillColor("#f8fafc");
        doc.roundedRect(
          imgX - 4,
          cursorY - 4,
          imgWidth + 8,
          imgHeight + 8,
          8,
          8,
          "F"
        );
        doc.addImage(
          imgData,
          "PNG",
          imgX,
          cursorY,
          imgWidth,
          imgHeight
        );
        cursorY += imgHeight + 18;
      }
    }

    // Resumen (limitado para evitar solapamiento)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor("#000000");
    const resumenMostrar = noticia.resumen_ia || noticia.resumen || "";
    let resumenLines = doc.splitTextToSize(resumenMostrar, boxWidth - padding * 2);
    const maxResumenLines = 5;
    if (resumenLines.length > maxResumenLines) {
      resumenLines = resumenLines.slice(0, maxResumenLines);
      resumenLines[maxResumenLines - 1] += " ...";
    }
    doc.text(resumenLines, margin + padding, cursorY);
    cursorY += resumenLines.length * (isCompact ? 12 : 14);

    // Leer más
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#da0b0a");
    doc.textWithLink("Leer más", margin + padding, cursorY, {
      url: noticia.url || "#",
    });
    cursorY += 20;

    // Calcular altura de la caja y dibujar borde elegante gris claro
    const boxHeightReal = isCompact ? 260 : cursorY - y + padding;
    doc.setDrawColor("#e0e0e0"); // gris claro
    doc.setLineWidth(1.2);
    doc.roundedRect(margin, y, boxWidth, boxHeightReal, 12, 12, "S");

    return y + boxHeightReal + (isCompact ? 5 : 20);
  }

  return { generarBoletin, generando, errorGen };
}