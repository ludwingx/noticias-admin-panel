import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AiOutlineLogin, AiOutlineUserAdd } from "react-icons/ai";
import SignOutButton from "./SignOutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  return (
    <nav className="bg-gradient-to-r from-white via-blue-50 to-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img
            src="https://i.ibb.co/BVtY6hmb/image-4.png"
            alt="Tuto Quiroga & Libre, logo"
            width={180}
            height={40}
            className="cursor-pointer select-none"
            loading="eager"
            draggable={false}
          />
        </Link>

        {/* Desktop menu */}
        <ul className="hidden md:flex gap-6 text-[#123488] font-semibold text-base items-center">
          {!session?.user ? (
            <>
              <li>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 hover:text-[#da0b0a] transition-colors"
                >
                  <AiOutlineLogin size={20} />
                  Iniciar sesión
                </Link>
              </li>
              {/*
              <li>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-2 hover:text-[#da0b0a] transition-colors"
                >
                  <AiOutlineUserAdd size={20} />
                  Registrarse
                </Link>
              </li>
              */}
            </>
          ) : (
            <li>
              <SignOutButton />
            </li>
          )}
        </ul>

        {/* Mobile menu */}
        <details className="md:hidden relative group">
          <summary className="cursor-pointer text-[#123488] font-semibold text-sm">
            ☰ Menú
          </summary>
          <ul className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-2 text-sm">
            {!session?.user ? (
              <>
                <li>
                  <Link
                    href="/auth/login"
                    className="block px-4 py-2 hover:bg-gray-100 text-[#123488]"
                  >
                    <AiOutlineLogin className="inline mr-1" />
                    Iniciar sesión
                  </Link>
                </li>
                {/*
                <li>
                  <Link
                    href="/auth/register"
                    className="block px-4 py-2 hover:bg-gray-100 text-[#123488]"
                  >
                    <AiOutlineUserAdd className="inline mr-1" />
                    Registrarse
                  </Link>
                </li>
                */}
              </>
            ) : (
              <li className="px-4 py-2">
                <SignOutButton />
              </li>
            )}
          </ul>
        </details>
      </div>
    </nav>
  );
}
