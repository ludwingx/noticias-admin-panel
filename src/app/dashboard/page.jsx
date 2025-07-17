"use client";

import { useState, useEffect } from "react";
import NewsSection from "@/components/NewsSection";
import ActionButtons from "@/components/ActionButtons";
import Filters from "@/components/Filters";
import Timer from "@/components/Timer";
import LoadingModal from "@/components/LoadingModal";
import { useNews } from "@/hooks/useNews";
import { usePDFGenerator } from "@/hooks/usePDFGenerator";

export default function HomePage() {
  const {
    noticias,
    loading,
    noticiasTuto,
    noticiasJP,
    noticiasOtros,
    ejecutarWebhook,
    manejarEstado,
    actualizandoEstado,
    ejecutandoWebhook,
    waiting,
    showModal,
    mostrarModalCargaNoticias,
    timer,
    noNews,
    intentosSinNoticias,
    webhookError,
    contador,
    horaLocal,
    hayNoticias,
    articulosBrutos, // <-- nuevo
  } = useNews();

  const { generarBoletin, generando, errorGen } = usePDFGenerator(noticias);

  const [activeSection, setActiveSection] = useState("all");

  // Estado para manejar errores combinados
  const errorMessage = errorGen || webhookError;

  // Banner de extracción/filtrado de noticias
  const [mensajeExtraccion, setMensajeExtraccion] = useState("");

  // Calcula la diferencia de tiempo con la última noticia extraída hoy
  useEffect(() => {
    // 1. Prioridad: ArticulosBrutos recientes (<2 min)
    if (articulosBrutos && articulosBrutos.length > 0) {
      const ahora = new Date();
      const ultimo = articulosBrutos.reduce((a, b) =>
        new Date(a.creado) > new Date(b.creado) ? a : b
      );
      const creado = new Date(ultimo.creado);
      const diffMin = (ahora - creado) / 1000 / 60;
      if (diffMin < 2) {
        setMensajeExtraccion("Extrayendo y filtrando noticias, espere unos minutos");
        return;
      }
    }

    // 2. Si no hay ArticulosBrutos recientes, usa la lógica de News
    if (!hayNoticias) {
      setMensajeExtraccion("");
      return;
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const noticiasHoy = noticias.filter(n => {
      const fecha = n.created_at ? new Date(n.created_at) : null;
      if (!fecha) return false;
      return fecha >= hoy;
    });
    if (noticiasHoy.length === 0) {
      setMensajeExtraccion("");
      return;
    }
    const ultima = noticiasHoy.reduce((a, b) => {
      const fechaA = a.created_at ? new Date(a.created_at) : new Date(0);
      const fechaB = b.created_at ? new Date(b.created_at) : new Date(0);
      return fechaA > fechaB ? a : b;
    });
    const fechaUltima = ultima.created_at ? new Date(ultima.created_at) : null;
    if (!fechaUltima) {
      setMensajeExtraccion("");
      return;
    }
    function actualizarMensaje() {
      const ahora = new Date();
      const diffMs = ahora - fechaUltima;
      const diffMin = diffMs / 1000 / 60;
      if (diffMin < 3) {
        setMensajeExtraccion("Las últimas noticias relevantes ya están siendo procesadas y se visualizarán pronto en pantalla.");
      } else {
        setMensajeExtraccion("Ya se han extraído y filtrado las noticias para hoy");
      }
    }
    actualizarMensaje();
    const interval = setInterval(actualizarMensaje, 10000); // Actualiza cada 10s
    return () => clearInterval(interval);
  }, [articulosBrutos, noticias, hayNoticias]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 min-h-[70vh] flex items-center justify-center">
        <p className="text-lg">Cargando noticias...</p>
      </main>
    );
  }

  if (!loading && noticias.length === 0) {
    return (
      <main className="min-h-[70vh] flex flex-col justify-center items-center px-4 py-10 bg-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">¡Bienvenido! Aún no se procesaron noticias hoy</h1>
        <span className="text-gray-500 text-lg mb-6 text-center font-semibold max-w-xl">
        Podés comenzar buscando, extrayendo, filtrando y generando resúmenes con IA haciendo clic aquí abajo. 🚀
        </span>
        
        <ActionButtons
          ejecutarWebhook={ejecutarWebhook}
          generarBoletin={generarBoletin}
          ejecutandoWebhook={ejecutandoWebhook || waiting}
          generando={generando}
          hayNoticias={hayNoticias}
          contador={contador}
        />
        
        
        {hayNoticias && contador !== null && (
          <p className="text-yellow-600 mt-4 text-center">
            Ya se extrajeron noticias. Podrás volver a cargar a las 8:30 am de
            mañana.
          </p>
        )}
        
        {errorMessage && (
          <p className="text-red-600 mt-4 text-center max-w-md">
            {errorMessage}
          </p>
        )}
       {showModal && mostrarModalCargaNoticias && <LoadingModal timer={timer} />}
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-white">


      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Noticias recientes</h1>
        
        <ActionButtons
          ejecutarWebhook={ejecutarWebhook}
          generarBoletin={generarBoletin}
          ejecutandoWebhook={ejecutandoWebhook || waiting}
          generando={generando}
          hayNoticias={hayNoticias}
          contador={contador}
          showFullButtons
        />
      </div>

      <Filters 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
      />

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 rounded-md">
          <p className="text-red-600">{errorMessage}</p>
        </div>
      )}
      {/* Banner extracción/filtrado */}
      {hayNoticias && mensajeExtraccion && (
        <div className={`mb-6 px-4 py-3 rounded-md text-center font-semibold ${
  mensajeExtraccion.includes('completó') || mensajeExtraccion.includes('extraído')
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
}`}>
  {mensajeExtraccion}
</div>
      )}
      {/* Sección Tuto Quiroga */}
      <SectionWrapper 
        activeSection={activeSection} 
        section="tuto"
      >
        <NewsSection
          title="Noticias de: Tuto Quiroga"
          noticias={noticiasTuto}
          colorClass="text-[#123488]"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="Hoy no hay noticias de Tuto Quiroga."
        />
      </SectionWrapper>

      {/* Sección Juan Pablo Velasco */}
      <SectionWrapper 
        activeSection={activeSection} 
        section="jp"
      >
        <NewsSection
          title="Noticias de: Juan Pablo Velasco"
          noticias={noticiasJP}
          colorClass="text-[#da0b0a]"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="Hoy no hay noticias de Juan Pablo Velasco."
        />
      </SectionWrapper>

      {/* Sección Otras Noticias */}
      <SectionWrapper 
        activeSection={activeSection} 
        section="otros"
      >
        <NewsSection
          title="Otras Noticias"
          noticias={noticiasOtros}
          colorClass="text-gray-700"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="No hay noticias cargadas."
        />
      </SectionWrapper>

      {showModal && <LoadingModal timer={timer} />}
    </main>
  );
}

// Componente auxiliar para manejar la lógica de secciones
function SectionWrapper({ activeSection, section, children }) {
  if (activeSection !== "all" && activeSection !== section) {
    return null;
  }
  return children;
}