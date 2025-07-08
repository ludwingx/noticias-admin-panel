import Image from "next/image";
import { MdCheckCircle, MdCancel } from "react-icons/md";

export default function NewsCard({ noticia, manejarEstado, estaActualizando }) {
  const estadoActual = noticia.estado?.toLowerCase() || null;

  return (
    <article className="border rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col h-full">
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

      <h3 className="text-sm sm:text-base font-semibold mb-2">Resumen IA</h3>
      <p className="text-sm sm:text-base text-gray-700 flex-1">
        {noticia.resumen_ia}
      </p>

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
                : "bg-gray-200 text-gray-700 hover:bg-green-500 hover:text-white"
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
                : "bg-gray-200 text-gray-700 hover:bg-red-500 hover:text-white"
            } ${estaActualizando ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <MdCancel className="text-lg" />
            {estaActualizando ? "Actualizando..." : "Rechazar"}
          </button>
        </div>
      </div>
    </article>
  );
}