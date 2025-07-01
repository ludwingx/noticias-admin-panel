"use client";

import { useSession } from "next-auth/react";

function HomePage() {
  const { data: session, status } = useSession();

  // Mientras carga la sesión, puedes mostrar algo (o null)
  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white flex flex-col items-center justify-center px-6 py-20 font-sans text-gray-900">
      <main className="flex flex-col items-center text-center max-w-lg gap-8 w-full">
        {/* Logo */}
        <img
          src="https://i.ibb.co/BVtY6hmb/image-4.png"
          alt="Tuto Quiroga & Libre, logo"
          width={280}
          height={60}
          className="mb-24 max-w-full h-auto"
          loading="eager"
        />

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight">
          Panel de Noticias
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-700 max-w-md leading-relaxed">
          Administra noticias: revisa, aprueba y genera boletines informativos de forma fácil y rápida.
        </p>

        {/* Call to action */}
        <a
          href={session ? "/dashboard" : "/auth/login"}
          className="inline-block rounded-full bg-[#1a3680] px-10 py-3 text-white text-lg font-semibold shadow-md hover:bg-[#163065] focus:outline-none focus:ring-4 focus:ring-[#1a3680]/50 transition"
          aria-label={session ? "Ver noticias" : "Iniciar sesión"}
        >
          {session ? "Ver noticias" : "Iniciar sesión"}
        </a>
      </main>

      <footer className="mt-auto text-center text-sm text-gray-500 select-none py-4 w-full">
        &copy; {new Date().getFullYear()} Intelexia Labs
      </footer>
    </div>
  );
}

export default HomePage;
