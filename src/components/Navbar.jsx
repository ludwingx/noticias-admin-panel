import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CiLogout } from "react-icons/ci";
import { AiOutlineHome, AiOutlineLogin, AiOutlineUserAdd } from "react-icons/ai";
import { MdOutlineArticle } from "react-icons/md";

async function Navbar() {
  const session = await getServerSession(authOptions);
  console.log(session);

  return (
    <nav className="flex justify-between items-center bg-gradient-to-r from-white via-blue-50 to-white px-6 md:px-24 py-4 shadow-sm">
      {/* Logo */}
      <Link href="/">
        <img
          src="https://i.ibb.co/BVtY6hmb/image-4.png"
          alt="Tuto Quiroga & Libre, logo"
          width={250}  // más grande
          height={40}  // más alto
          className="cursor-pointer"
          loading="eager"
        />
      </Link>

      {/* Menu links */}
      <ul className="flex gap-6 text-gray-900 font-semibold text-lg items-center">
        {!session?.user ? (
          <>
            <li>
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-[#1a3680] transition-colors duration-200"
              >
                <AiOutlineHome size={20} /> Home
              </Link>
            </li>
            <li>
              <Link
                href="/auth/login"
                className="flex items-center gap-1 hover:text-[#1a3680] transition-colors duration-200"
              >
                <AiOutlineLogin size={20} /> Login
              </Link>
            </li>
            <li>
              <Link
                href="/auth/register"
                className="flex items-center gap-1 hover:text-[#1a3680] transition-colors duration-200"
              >
                <AiOutlineUserAdd size={20} /> Register
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-[#1a3680] transition-colors duration-200"
              >
                <MdOutlineArticle size={20} /> Noticias
              </Link>
            </li>
            <li>
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-1 hover:text-[#1a3680] transition-colors duration-200"
              >
                Cerrar sesión <CiLogout size={20} />
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
