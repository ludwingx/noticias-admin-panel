import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
          width={140}
          height={30}
          className="cursor-pointer"
          loading="eager"
        />
      </Link>

      {/* Menu links */}
      <ul className="flex gap-6 text-gray-900 font-semibold text-lg">
        {!session?.user ? (
          <>
            <li>
              <Link
                href="/"
                className="hover:text-[#1a3680] transition-colors duration-200"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/auth/login"
                className="hover:text-[#1a3680] transition-colors duration-200"
              >
                Login
              </Link>
            </li>
            <li>
              <Link
                href="/auth/register"
                className="hover:text-[#1a3680] transition-colors duration-200"
              >
                Register
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                href="/dashboard"
                className="hover:text-[#1a3680] transition-colors duration-200"
              >
                Noticias
              </Link>
            </li>
            <li>
              <Link
                href="/api/auth/signout"
                className="hover:text-[#1a3680] transition-colors duration-200"
              >
                Cerrar sesión
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
