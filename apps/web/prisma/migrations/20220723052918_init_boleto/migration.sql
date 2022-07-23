-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('NUBANK', 'ALUGUEL', 'NET', 'COND', 'ENERGIA', 'C6');

-- CreateTable
CREATE TABLE "Boleto" (
    "id" SERIAL NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "meta" JSONB NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Boleto_pkey" PRIMARY KEY ("id")
);
