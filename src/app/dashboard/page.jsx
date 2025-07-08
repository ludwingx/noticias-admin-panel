"use client";

import { useEffect, useState } from "react";
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

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p>Cargando noticias...</p>
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
          <p className="text-yellow-600 mt-4">
            Ya se extrajeron noticias. Podrás volver a cargar a las 8:30 am de
            mañana.
          </p>
        )}
        
        {webhookError && <p className="text-red-600 mt-4">{webhookError}</p>}
        {showModal && <LoadingModal timer={timer} />}
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

      {errorGen && <p className="text-red-600 mb-4">{errorGen}</p>}
      {webhookError && <p className="text-red-600 mb-4">{webhookError}</p>}

      {/* Sección Tuto Quiroga */}
      {(activeSection === "all" || activeSection === "tuto") && (
        <NewsSection
          title="Noticias de: Tuto Quiroga"
          noticias={noticiasTuto}
          colorClass="text-[#123488]"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="Hoy no hay noticias de Tuto Quiroga."
        />
      )}

      {/* Sección Juan Pablo Velasco */}
      {(activeSection === "all" || activeSection === "jp") && (
        <NewsSection
          title="Noticias de: Juan Pablo Velasco"
          noticias={noticiasJP}
          colorClass="text-[#da0b0a]"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="Hoy no hay noticias de Juan Pablo Velasco."
        />
      )}

      {/* Sección Otras Noticias */}
      {(activeSection === "all" || activeSection === "otros") && (
        <NewsSection
          title="Otras Noticias"
          noticias={noticiasOtros}
          colorClass="text-gray-700"
          manejarEstado={manejarEstado}
          actualizandoEstado={actualizandoEstado}
          noNewsMessage="No hay noticias cargadas."
        />
      )}

      {showModal && <LoadingModal timer={timer} />}
    </main>
  );
}