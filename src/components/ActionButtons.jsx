import { FaFilePdf } from "react-icons/fa6";
import { FiDownload } from "react-icons/fi";

export default function ActionButtons({
  ejecutarWebhook,
  generarBoletin,
  ejecutandoWebhook,
  generando,
  hayNoticias,
  contador,
  showFullButtons = false,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {showFullButtons && (
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
      )}
      
      <button
        onClick={ejecutarWebhook}
        disabled={ejecutandoWebhook || hayNoticias}
        className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition text-sm sm:text-base"
      >
        {ejecutandoWebhook
          ? "Ejecutando..."
          : hayNoticias && contador !== null
          ? `Disponible en ${contador.horas.toString().padStart(2, "0")}:${
              contador.minutos.toString().padStart(2, "0")
            }:${contador.segundos.toString().padStart(2, "0")}`
          : "Cargar Noticias"}
      </button>
    </div>
  );
}