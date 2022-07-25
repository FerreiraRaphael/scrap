/*
  Warnings:

  - A unique constraint covering the columns `[codigoBarras,tipo]` on the table `Boleto` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Boleto_codigoBarras_tipo_key" ON "Boleto"("codigoBarras", "tipo");
