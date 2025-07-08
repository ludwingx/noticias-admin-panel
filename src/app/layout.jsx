import Navbar from "@/components/Navbar";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tuto Noticias",
  description: "Aplicación para aprobar o rechazar noticias de Tuto, JP Velasco y Otras noticias reelvante para su posterior descarga de pdf del boletin de noticias aprobadas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
