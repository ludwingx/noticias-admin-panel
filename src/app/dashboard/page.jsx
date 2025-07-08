"use client";

import { useState } from "react";
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
  } = useNews();

  const { generarBoletin, generando, errorGen } = usePDFGenerator(noticias);

  const [activeSection, setActiveSection] = useState("all");

  // Estado para manejar errores combinados
  const errorMessage = errorGen || webhookError;

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
        <h1 className="text-3xl font-bold mb-6">Noticias recientes</h1>
        <p className="text-gray-500 text-lg mb-6">
          No hay noticias disponibles.
        </p>
        
        <ActionButtons
          ejecutarWebhook={ejecutarWebhook}
          generarBoletin={generarBoletin}
          ejecutandoWebhook={ejecutandoWebhook || waiting}
          generando={generando}
          hayNoticias={hayNoticias}
          contador={contador}
        />
        
        <p className="text-gray-400 mt-2 text-sm">Hora local: {horaLocal}</p>
        
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