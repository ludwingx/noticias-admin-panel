import NewsCard from "./NewsCard";

export default function NewsSection({
  title,
  noticias,
  colorClass,
  manejarEstado,
  actualizandoEstado,
  noNewsMessage,
}) {
  return (
    <div className="mb-8">
      <h2 className={`text-xl font-bold mb-4 ${colorClass}`}>{title}</h2>
      {noticias.length > 0 ? (
        <div className="grid gap-6">
          {noticias.map((noticia) => (
            <NewsCard
              key={noticia.id}
              noticia={noticia}
              manejarEstado={manejarEstado}
              estaActualizando={actualizandoEstado[noticia.id]}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">{noNewsMessage}</p>
      )}
      <hr className="border-t border-gray-300 mt-6" />
    </div>
  );
}