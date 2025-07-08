-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'LECTOR');

-- CreateEnum
CREATE TYPE "EstadoArticulo" AS ENUM ('SIN_TRABAJAR', 'EN_PROCESO', 'PROCESADO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Rol" NOT NULL DEFAULT 'LECTOR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT,
    "fecha_publicacion" TIMESTAMP(3),
    "imagen" TEXT,
    "resumen" TEXT,
    "contenido" TEXT,
    "fuente" TEXT,
    "url" TEXT,
    "resumen_ia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "categoria" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticuloBruto" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "estado" "EstadoArticulo" NOT NULL DEFAULT 'SIN_TRABAJAR',
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticuloBruto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ArticuloBruto_url_key" ON "ArticuloBruto"("url");
