import { useState, useEffect } from "react";

export function useNews() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejecutandoWebhook, setEjecutandoWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState(null);
  const [timer, setTimer] = useState(20);
  const [waiting, setWaiting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [noNews, setNoNews] = useState(false);
  const [intentosSinNoticias, setIntentosSinNoticias] = useState(0);
  const [actualizandoEstado, setActualizandoEstado] = useState({});
  const [contador, setContador] = useState(null);
  const [horaLocal, setHoraLocal] = useState("");

  // Filtrar noticias por categoría
  const noticiasTuto = noticias.filter(
    (n) => (n.categoria || "").toUpperCase() === "TUTO"
  );
  const noticiasJP = noticias.filter(
    (n) => (n.categoria || "").toUpperCase() === "JP"
  );
  const noticiasOtros = noticias.filter((n) => {
    const cat = (n.categoria || "").toUpperCase();
    return cat !== "TUTO" && cat !== "JP";
  });
  const hayNoticias = noticias.length > 0;

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

  // Efecto para el contador de recarga
  useEffect(() => {
    let interval;
    function updateContador() {
      if (hayNoticias) {
        setContador(getTiempoRestanteHasta830amSiguiente());
      } else {
        setContador(null);
      }
    }
    updateContador();
    if (hayNoticias) {
      interval = setInterval(updateContador, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hayNoticias]);

  async function esperarCambioNoticias(condicionCambio, maxIntentos = 3, mostrarModal = true) {
    if (mostrarModal) {
      setWaiting(true);
      setShowModal(true);
    }
    setNoNews(false);
    setTimer(20);
    setIntentosSinNoticias(0);

    let keepWaiting = true;
    let foundCambio = false;
    let intentos = 0;

    try {
      while (keepWaiting) {
        for (let t = 20; t > 0; t--) {
          setTimer(t);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setTimer(0);

        const noticiasRes = await fetch("/api/noticias");
        const nuevasNoticias = await noticiasRes.json();

        if (condicionCambio(nuevasNoticias)) {
          setNoticias(nuevasNoticias);
          foundCambio = true;
          keepWaiting = false;
          if (mostrarModal) {
            setWaiting(false);
            setShowModal(false);
          }
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
      if (!foundCambio && mostrarModal) {
        setWaiting(false);
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      setWebhookError("Error al esperar cambios en las noticias.");
      if (mostrarModal) {
        setWaiting(false);
        setShowModal(false);
      }
      setIntentosSinNoticias(0);
      setNoNews(false);
    }
  }

  async function ejecutarWebhook() {
    setEjecutandoWebhook(true);
    setWebhookError(null);
    try {
      const res = await fetch(
        "https://n8n-torta-express.qnfmlx.easypanel.host/webhook/44ccd0ac-cab7-45f8-aa48-317e9400ca2d",
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Error al ejecutar el webhook");

      await esperarCambioNoticias(
        (nuevasNoticias) => Array.isArray(nuevasNoticias) && nuevasNoticias.length > 0
      ); // mostrarModal = true por defecto
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

    try {
      const res = await fetch("/api/noticias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado.toUpperCase() }),
      });

      if (!res.ok) throw new Error("Error al actualizar estado");

      await res.json();

      // NO mostrar modal en esta espera
      await esperarCambioNoticias(
        (nuevasNoticias) => {
          const noticiaActualizada = nuevasNoticias.find((n) => n.id === id);
          return (
            noticiaActualizada &&
            noticiaActualizada.estado?.toLowerCase() === nuevoEstado.toLowerCase()
          );
        },
        3,
        false // <--- Aquí está la clave para NO mostrar modal al aprobar/rechazar
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

  function getTiempoRestanteHasta830amSiguiente() {
    const ahora = new Date();
    const ahoraBolivia = new Date(
      ahora.toLocaleString("en-US", { timeZone: "America/La_Paz" })
    );
    let siguiente830 = new Date(ahoraBolivia);
    siguiente830.setHours(8, 30, 0, 0);

    if (ahoraBolivia >= siguiente830) {
      siguiente830.setDate(siguiente830.getDate() + 1);
    }

    const diff = siguiente830 - ahoraBolivia;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);

    return { horas, minutos, segundos };
  }

  return {
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
  };
}
