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
         getBase64ImageFromUrl(
           "https://i.postimg.cc/rFJtBVqs/Proyecto-nuevo-3.png"
         ),
         getBase64ImageFromUrl(
           "https://i.postimg.cc/MZDMg3pY/Proyecto-nuevo-1.png"
         ),
       ]);
 
       // Altura máxima para la cabecera
       const headerHeight = 35;
 
       // Agregar logo izquierdo
       if (logoIzquierda) {
         doc.addImage(
           logoIzquierda,
           "PNG",
           margin,
           y,
           100, // ancho
           headerHeight // alto
         );
       }
 
       // Agregar logo central
       if (logoCentro) {
         const centerImgWidth = 110;
         const ajusteManual = -10; // mueve hacia la izquierda si está muy a la derecha, o pon -5 si está a la izquierda
         doc.addImage(
           logoCentro,
           "PNG",
           pageWidth / 2 - centerImgWidth / 2 + ajusteManual,
           y,
           centerImgWidth,
           headerHeight
         );
       }
 
       y += headerHeight + 30; // Espacio después de la cabecera
 
       // Fecha y hora
       const fechaHora = new Date().toLocaleString("es-ES", {
         dateStyle: "full",
         timeStyle: "short",
       });
 
       doc.setFont("helvetica", "bold");
       doc.setFontSize(20);
       doc.setTextColor("#000000");
       doc.text(`Tuto Noticias - ${fechaHora}`, pageWidth / 2, y, {
         align: "center",
       });
       y += 30;
 
       // Resto del código para agregar noticias (se mantiene igual)
       // Primera página: máximo 2 noticias
       let noticiasEnPrimeraPagina = Math.min(noticiasAprobadas.length, 2);
       let noticiasRestantes =
         noticiasAprobadas.length - noticiasEnPrimeraPagina;
 
       // Procesar primera página (2 noticias)
       for (let i = 0; i < noticiasEnPrimeraPagina; i++) {
         const noticia = noticiasAprobadas[i];
         const boxWidth = pageWidth - margin * 2;
         const padding = 15;
       
         let boxStartY = y;
         let cursorY = boxStartY + padding;
       
         doc.setDrawColor("#e0e0e0");
         doc.setFillColor("#ffffff");
         doc.setLineWidth(1);
       
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
             doc.roundedRect(
               margin + padding - 2,
               cursorY - 2,
               imgWidth + 4,
               imgHeight + 4,
               4,
               4,
               "F"
             );
             doc.addImage(
               imgData,
               "PNG",
               margin + padding,
               cursorY,
               imgWidth,
               imgHeight
             );
             cursorY += imgHeight + 10;
           }
         }
 
         doc.setFont("helvetica", "italic");
         doc.setFontSize(11);
         doc.setTextColor("#000000");
         const resumenMostrar = noticia.resumen_ia || noticia.resumen || "";
         const resumenLines = doc.splitTextToSize(
           resumenMostrar,
           boxWidth - padding * 2
         );
         doc.text(resumenLines, margin + padding, cursorY);
         cursorY += resumenLines.length * 14;
 
         doc.setFont("helvetica", "normal");
         doc.setFontSize(11);
         doc.setTextColor("#da0b0a");
         doc.textWithLink("Leer más", margin + padding, cursorY, {
           url: noticia.url || "#",
         });
         cursorY += 20;
 
         // Calcular la altura real de la caja y dibujar el fondo
         const boxHeightReal = cursorY - boxStartY + padding;
         doc.roundedRect(margin, boxStartY, boxWidth, boxHeightReal, 6, 6, "S");
 
         // Actualizar y con espacio entre noticias
         y = boxStartY + boxHeightReal + 20;
       }
 
       // Si hay más noticias, crear nuevas páginas con 3 noticias cada una
       if (noticiasRestantes > 0) {
         let noticiasEnPagina = 0;
         doc.addPage();
         y = margin;
 
         for (
           let i = noticiasEnPrimeraPagina;
           i < noticiasAprobadas.length;
           i++
         ) {
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
           const fechaPub = new Date(
             noticia.fecha_publicacion
           ).toLocaleDateString();
           const metaText = `${fechaPub} | Autor: ${
             noticia.autor || "Desconocido"
           }`;
           doc.text(metaText, margin + padding, cursorY);
           cursorY += 18;
 
           doc.setFont("helvetica", "bold");
           doc.setFontSize(13);
           doc.setTextColor("#12358d");
           const titleLines = doc.splitTextToSize(
             noticia.titulo,
             boxWidth - padding * 2
           );
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
               doc.roundedRect(
                 margin + padding - 2,
                 cursorY - 2,
                 imgWidth + 4,
                 imgHeight + 4,
                 4,
                 4,
                 "F"
               );
               doc.addImage(
                 imgData,
                 "PNG",
                 margin + padding,
                 cursorY,
                 imgWidth,
                 imgHeight
               );
               cursorY += imgHeight + 10;
             }
           }
 
           doc.setFont("helvetica", "italic");
           doc.setFontSize(11);
           doc.setTextColor("#000000");
           const resumenMostrar = noticia.resumen_ia || noticia.resumen || "";
           const resumenLines = doc.splitTextToSize(
             resumenMostrar,
             boxWidth - padding * 2
           );
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
         "Enero",
         "Febrero",
         "Marzo",
         "Abril",
         "Mayo",
         "Junio",
         "Julio",
         "Agosto",
         "Septiembre",
         "Octubre",
         "Noviembre",
         "Diciembre",
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

    // Imagen
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
        
        if (isCompact && imgHeight > 80) {
          imgHeight = 80;
          imgWidth = imgHeight / ratio;
        } else if (imgHeight > 120) {
          imgHeight = 120;
          imgWidth = imgHeight / ratio;
        }
        
        doc.setFillColor("#fff");
        doc.roundedRect(
          margin + padding - 2,
          cursorY - 2,
          imgWidth + 4,
          imgHeight + 4,
          4,
          4,
          "F"
        );
        doc.addImage(
          imgData,
          "PNG",
          margin + padding,
          cursorY,
          imgWidth,
          imgHeight
        );
        cursorY += imgHeight + 10;
      }
    }

    // Resumen
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor("#000000");
    const resumenMostrar = noticia.resumen_ia || noticia.resumen || "";
    const resumenLines = doc.splitTextToSize(resumenMostrar, boxWidth - padding * 2);
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

    // Dibujar caja
    const boxHeightReal = isCompact ? 260 : cursorY - y + padding;
    doc.roundedRect(margin, y, boxWidth, boxHeightReal, 6, 6, "S");

    return y + boxHeightReal + (isCompact ? 5 : 20);
  }

  return { generarBoletin, generando, errorGen };
}